/**
 * FocusBuddy - FaceMesh 面部检测模块 v2.2
 * 使用 MediaPipe Camera 工具类（与旧项目一致的可靠帧管线）
 * 4种检测: EAR闭眼 / headRatio低头 / turnRatio转头 / MAR打哈欠
 * 暴露: window.FocusBuddyVision
 */
(function() {
  'use strict';

  var STATUS = { LOADING:'loading', FOCUSED:'focused', DISTRACTED:'distracted', EYE_CLOSED:'eye_closed', AWAY:'away', IDLE:'idle' };

  var EAR_THRESHOLD=0.22, BLINK_FILTER_MS=800, TURN_THRESHOLD=0.62, HEAD_THRESHOLD=0.38, MAR_THRESHOLD=0.6, YAWN_MIN_MS=1200, AWAY_TIMEOUT=10;
  var SENSITIVITY_MAP = { low:{yaw:40,pitch:35,ear:0.18,turn:0.55}, medium:{yaw:30,pitch:25,ear:0.22,turn:0.62}, high:{yaw:20,pitch:15,ear:0.26,turn:0.68} };
  var LEFT_EYE_IDX=[33,160,158,133,153,144], RIGHT_EYE_IDX=[362,385,387,263,373,380];

  var faceMesh=null, video=null, canvas=null, ctx=null, cameraSelect=null, isRunning=false, _camera=null;
  var _status=STATUS.IDLE, _sensitivity='medium', _statusCallbacks=[], _awaySince=null;
  var eyeCloseStart=null, mouthOpenStart=null, _focusScore=100;
  var _frameW=640, _frameH=480;
  var _detection={ yaw:0,pitch:0,roll:0, ear:1.0,turnRatio:1.0,headRatio:0.5,mar:0, eyesClosed:false,headTurned:false,headDown:false,yawning:false, confidence:0 };

  function _dist(a,b){ return Math.hypot((a.x-b.x)*_frameW,(a.y-b.y)*_frameH); }
  function _mx(nx){ return 1-nx; }
  function _calcEAR(lm,idx){ var p=idx.map(function(i){return lm[i]}); return (_dist(p[1],p[5])+_dist(p[2],p[4]))/(2*_dist(p[0],p[3])||0.01); }

  // ===== init =====
  function init(){
    video=document.getElementById('video'); canvas=document.getElementById('overlay'); ctx=canvas.getContext('2d'); cameraSelect=document.getElementById('camera-select');
    if(typeof FaceMesh==='undefined'||typeof Camera==='undefined') return Promise.reject(new Error('FaceMesh/Camera未加载'));
    faceMesh=new FaceMesh({locateFile:function(f){return'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/'+f}});
    faceMesh.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});
    faceMesh.onResults(_onResults);
    return _enum().then(function(){return _startCam()});
  }

  function _enum(){
    return navigator.mediaDevices.enumerateDevices().then(function(devices){
      var cams=devices.filter(function(d){return d.kind==='videoinput'});
      cameraSelect.innerHTML='';
      cams.forEach(function(cam,i){var o=document.createElement('option');o.value=cam.deviceId;o.textContent=cam.label||'摄像头 '+(i+1);cameraSelect.appendChild(o)});
      if(cams.length===0){var o=document.createElement('option');o.textContent='（无摄像头）';cameraSelect.appendChild(o)}
    });
  }

  function _startCam(deviceId){
    if(_camera){_camera.stop();}
    return navigator.mediaDevices.getUserMedia({video:deviceId?{deviceId:{ideal:deviceId}}:true,audio:false}).then(function(stream){
      video.srcObject=stream;
      return new Promise(function(r){video.onloadedmetadata=function(){_frameW=video.videoWidth||640;_frameH=video.videoHeight||480;_resize();video.classList.add('mirrored');r()}});
    });
  }
  cameraSelect.addEventListener('change',function(){if(this.value)_startCam(this.value)});
  function _resize(){var r=video.getBoundingClientRect();canvas.width=r.width;canvas.height=r.height}
  window.addEventListener('resize',_resize);

  // ===== detection =====
  function _onResults(r){
    var lm=r.multiFaceLandmarks?.[0];
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!lm){_handleNoFace();return}
    _awaySince=null;
    _yaw(lm);_eyes(lm);_turn(lm);_head(lm);_yawn(lm);_score();_detStatus();
  }

  function _yaw(lm){var n=lm[1],le=lm[133],re=lm[362],mx=(le.x+re.x)/2,my=(le.y+re.y)/2,ed=Math.hypot(re.x-le.x,re.y-le.y)||0.01;_detection.yaw=Math.round((n.x-mx)/ed*60*10)/10;_detection.pitch=Math.round((n.y-my)/ed*40*10)/10;_detection.roll=Math.round(Math.atan2(re.y-le.y,re.x-le.x)*180/Math.PI*10)/10;_detection.confidence=1.0}
  function _eyes(lm){_detection.ear=Math.round((_calcEAR(lm,LEFT_EYE_IDX)+_calcEAR(lm,RIGHT_EYE_IDX))/2*100)/100;var s=SENSITIVITY_MAP[_sensitivity];if(_detection.ear<s.ear){if(eyeCloseStart===null)eyeCloseStart=Date.now()}else eyeCloseStart=null;_detection.eyesClosed=eyeCloseStart!==null&&(Date.now()-eyeCloseStart)>=BLINK_FILTER_MS}
  function _turn(lm){var n=lm[1],lc=lm[234],rc=lm[454],nl=_dist(n,lc),nr=_dist(n,rc);_detection.turnRatio=Math.round(Math.min(nl,nr)/(Math.max(nl,nr)||0.01)*100)/100;_detection.headTurned=_detection.turnRatio<SENSITIVITY_MAP[_sensitivity].turn}
  function _head(lm){var nt=lm[1],fh=lm[10],ch=lm[152],f=_dist(fh,ch),n=_dist(nt,ch);_detection.headRatio=Math.round(n/(f||0.01)*100)/100;_detection.headDown=_detection.headRatio<HEAD_THRESHOLD}
  function _yawn(lm){var mt=lm[13],mb=lm[14],ml=lm[61],mr=lm[291];_detection.mar=Math.round(_dist(mt,mb)/(_dist(ml,mr)||0.01)*100)/100;if(_detection.mar>MAR_THRESHOLD){if(mouthOpenStart===null)mouthOpenStart=Date.now()}else mouthOpenStart=null;_detection.yawning=mouthOpenStart!==null&&(Date.now()-mouthOpenStart)>=YAWN_MIN_MS}
  function _score(){var d=_detection.eyesClosed||_detection.headTurned||_detection.headDown||Math.abs(_detection.yaw)>SENSITIVITY_MAP[_sensitivity].yaw||Math.abs(_detection.pitch)>SENSITIVITY_MAP[_sensitivity].pitch;_focusScore=d?Math.max(0,_focusScore-0.15):Math.min(100,_focusScore+0.05)}
  function _detStatus(){var s;if(_detection.eyesClosed)s=STATUS.EYE_CLOSED;else if(_detection.headTurned||_detection.headDown)s=STATUS.DISTRACTED;else{var t=SENSITIVITY_MAP[_sensitivity];s=(Math.abs(_detection.yaw)>t.yaw||Math.abs(_detection.pitch)>t.pitch)?STATUS.DISTRACTED:STATUS.FOCUSED}_setStatus(s)}
  function _handleNoFace(){if(_awaySince===null)_awaySince=Date.now();if((Date.now()-_awaySince)>AWAY_TIMEOUT*1000){_setStatus(STATUS.AWAY);eyeCloseStart=null;mouthOpenStart=null;_detection.eyesClosed=false;_detection.yawning=false}}
  function _setStatus(s){if(_status!==s){_status=s;_statusCallbacks.forEach(function(cb){cb(s)});if(window.FocusBuddyEvents)window.FocusBuddyEvents.dispatchEvent(new CustomEvent('vision:status-changed',{detail:{status:s}}));if(window.FocusBuddyUI)window.FocusBuddyUI.updateVisionStatus(s)}}

  // ===== start/stop (Camera utility) =====
  function start(){if(isRunning)return;isRunning=true;_status=STATUS.LOADING;_camera=new Camera(video,{onFrame:async function(){await faceMesh.send({image:video})},width:640,height:480});_camera.start().then(function(){setTimeout(function(){_frameW=video.videoWidth||640;_frameH=video.videoHeight||480;_resize()},500)}).catch(function(e){console.error('[FaceMesh]',e);isRunning=false})}
  function stop(){isRunning=false;if(_camera){_camera.stop();_camera=null}}
  function isReady(){return!!faceMesh&&!!video.srcObject}

  // ===== API =====
  function getStatus(){return _status}
  function getFaceAngle(){return{yaw:_detection.yaw,pitch:_detection.pitch,roll:_detection.roll,confidence:_detection.confidence}}
  function getEAR(){return _detection.ear}
  function getTurnRatio(){return _detection.turnRatio}
  function getEyesClosed(){return _detection.eyesClosed}
  function getHeadTurned(){return _detection.headTurned}
  function getHeadDown(){return _detection.headDown}
  function getYawning(){return _detection.yawning}
  function getFocusScore(){return Math.round(_focusScore)}
  function getDetection(){var r={};for(var k in _detection)r[k]=_detection[k];r.focusScore=Math.round(_focusScore);return r}
  function onStatusChange(cb){_statusCallbacks.push(cb)}
  function setSensitivity(l){if(SENSITIVITY_MAP[l])_sensitivity=l}
  function destroy(){stop();if(video.srcObject)video.srcObject.getTracks().forEach(function(t){t.stop()})}

  window.FocusBuddyVision={init:init,start:start,stop:stop,getStatus:getStatus,getFaceAngle:getFaceAngle,getEAR:getEAR,getTurnRatio:getTurnRatio,getEyesClosed:getEyesClosed,getHeadTurned:getHeadTurned,getHeadDown:getHeadDown,getYawning:getYawning,getFocusScore:getFocusScore,getDetection:getDetection,onStatusChange:onStatusChange,setSensitivity:setSensitivity,isReady:isReady,destroy:destroy};
})();
