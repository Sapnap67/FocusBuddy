/**
 * FocusBuddy - FaceMesh 面部检测模块 v2.0
 * 
 * 检测算法（移植自旧项目"专注力检测器"）：
 *   1. yaw/pitch 朝向检测
 *   2. EAR 闭眼检测（Eye Aspect Ratio, 0.22阈值, 800ms眨眼过滤）
 *   3. turnRatio 转头检测（脸颊距离比, 0.62阈值）
 *   4. 专注度评分（0-100, 分心-0.15/帧, 专注+0.05/帧）
 * 
 * 暴露: window.FocusBuddyVision
 */

(function() {
  'use strict';

  var STATUS = { LOADING:'loading', FOCUSED:'focused', DISTRACTED:'distracted', EYE_CLOSED:'eye_closed', AWAY:'away', IDLE:'idle' };
  var AWAY_TIMEOUT = 10;

  // ===== 检测阈值（来自旧项目，已调优）=====
  var EAR_THRESHOLD = 0.22;
  var BLINK_FILTER_MS = 800;
  var TURN_THRESHOLD = 0.62;

  var SENSITIVITY_MAP = {
    low:    { yaw:40, pitch:35, ear:0.18, turn:0.55 },
    medium: { yaw:30, pitch:25, ear:0.22, turn:0.62 },
    high:   { yaw:20, pitch:15, ear:0.26, turn:0.68 }
  };

  // FaceMesh 关键点索引
  var LEFT_EYE_IDX  = [33, 160, 158, 133, 153, 144];
  var RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380];

  // ===== 状态 =====
  var faceMesh = null, video = null, canvas = null, ctx = null, cameraSelect = null;
  var isRunning = false, loopTimer = null, _stream = null;
  var _status = STATUS.IDLE, _sensitivity = 'medium', _statusCallbacks = [], _awaySince = null;
  var eyeCloseStart = null, _focusScore = 100;
  var _frameW = 640, _frameH = 480;

  var _detection = {
    yaw: 0, pitch: 0, roll: 0,
    ear: 1.0, turnRatio: 1.0,
    eyesClosed: false, headTurned: false,
    confidence: 0
  };

  // ===== 坐标辅助 =====
  function _dist(a, b) {
    var dx = (a.x - b.x) * _frameW;
    var dy = (a.y - b.y) * _frameH;
    return Math.hypot(dx, dy);
  }

  function _mx(nx) { return 1 - nx; }

  // ===== EAR 计算 =====
  function _calcEAR(lm, indices) {
    var p = indices.map(function(i) { return lm[i]; });
    var v1 = _dist(p[1], p[5]);
    var v2 = _dist(p[2], p[4]);
    var h  = _dist(p[0], p[3]);
    return (v1 + v2) / (2 * (h || 0.01));
  }

  // ===== 初始化 =====
  function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('overlay');
    ctx = canvas.getContext('2d');
    cameraSelect = document.getElementById('camera-select');

    if (typeof FaceMesh === 'undefined') {
      return Promise.reject(new Error('FaceMesh 未加载'));
    }

    faceMesh = new FaceMesh({
      locateFile: function(f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f; }
    });
    faceMesh.setOptions({
      maxNumFaces: 1, refineLandmarks: true,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });
    faceMesh.onResults(_onResults);

    return _enumerateCameras().then(function() { return _startCamera(); });
  }

  function _enumerateCameras() {
    return navigator.mediaDevices.enumerateDevices().then(function(devices) {
      var cams = devices.filter(function(d) { return d.kind === 'videoinput'; });
      cameraSelect.innerHTML = '';
      cams.forEach(function(cam, i) {
        var opt = document.createElement('option');
        opt.value = cam.deviceId;
        opt.textContent = cam.label || '摄像头 ' + (i + 1);
        cameraSelect.appendChild(opt);
      });
      if (cams.length === 0) {
        var opt = document.createElement('option');
        opt.textContent = '（无摄像头）';
        cameraSelect.appendChild(opt);
      }
    });
  }

  function _startCamera(deviceId) {
    if (_stream) { _stream.getTracks().forEach(function(t) { t.stop(); }); }
    var constraints = {
      video: deviceId ? { deviceId: { ideal: deviceId } } : true, audio: false
    };
    return navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      _stream = stream;
      video.srcObject = stream;
      return new Promise(function(resolve) {
        video.onloadedmetadata = function() {
          _frameW = video.videoWidth || 640;
          _frameH = video.videoHeight || 480;
          _resizeCanvas();
          video.classList.add('mirrored');
          resolve();
        };
      });
    });
  }

  cameraSelect.addEventListener('change', function() {
    if (this.value) _startCamera(this.value);
  });

  function _resizeCanvas() {
    var rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  window.addEventListener('resize', _resizeCanvas);

  // ===== 核心检测 =====
  function _onResults(results) {
    var lm = results.multiFaceLandmarks?.[0];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!lm) { _handleNoFace(); return; }
    _awaySince = null;

    _calcYawPitch(lm);
    _calcEyes(lm);
    _calcHeadTurn(lm);
    _calcFocusScore();
    _drawDebug(lm);
    _determineStatus();
  }

  function _calcYawPitch(lm) {
    var nose = lm[1], lEye = lm[133], rEye = lm[362];
    var midX = (lEye.x + rEye.x) / 2, midY = (lEye.y + rEye.y) / 2;
    var eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y) || 0.01;
    _detection.yaw   = Math.round((nose.x - midX) / eyeDist * 60 * 10) / 10;
    _detection.pitch = Math.round((nose.y - midY) / eyeDist * 40 * 10) / 10;
    _detection.roll  = Math.round(Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x) * 180 / Math.PI * 10) / 10;
    _detection.confidence = 1.0;
  }

  function _calcEyes(lm) {
    var leftEAR  = _calcEAR(lm, LEFT_EYE_IDX);
    var rightEAR = _calcEAR(lm, RIGHT_EYE_IDX);
    _detection.ear = Math.round((leftEAR + rightEAR) / 2 * 100) / 100;

    var sens = SENSITIVITY_MAP[_sensitivity];
    var closed = _detection.ear < sens.ear;

    if (closed) {
      if (eyeCloseStart === null) eyeCloseStart = Date.now();
    } else {
      eyeCloseStart = null;
    }
    _detection.eyesClosed = eyeCloseStart !== null &&
      (Date.now() - eyeCloseStart) >= BLINK_FILTER_MS;
  }

  function _calcHeadTurn(lm) {
    var nose = lm[1], leftCheek = lm[234], rightCheek = lm[454];
    var nl = _dist(nose, leftCheek), nr = _dist(nose, rightCheek);
    var mn = Math.min(nl, nr), mx = Math.max(nl, nr);
    _detection.turnRatio = Math.round(mn / (mx || 0.01) * 100) / 100;

    var sens = SENSITIVITY_MAP[_sensitivity];
    _detection.headTurned = _detection.turnRatio < sens.turn;
  }

  function _calcFocusScore() {
    var sens = SENSITIVITY_MAP[_sensitivity];
    var distracted = _detection.eyesClosed || _detection.headTurned ||
      Math.abs(_detection.yaw) > sens.yaw ||
      Math.abs(_detection.pitch) > sens.pitch;

    if (distracted) {
      _focusScore = Math.max(0, _focusScore - 0.15);
    } else {
      _focusScore = Math.min(100, _focusScore + 0.05);
    }
  }

  function _determineStatus() {
    var newStatus;
    if (_detection.eyesClosed) {
      newStatus = STATUS.EYE_CLOSED;
    } else if (_detection.headTurned) {
      newStatus = STATUS.DISTRACTED;
    } else {
      var sens = SENSITIVITY_MAP[_sensitivity];
      if (Math.abs(_detection.yaw) > sens.yaw || Math.abs(_detection.pitch) > sens.pitch) {
        newStatus = STATUS.DISTRACTED;
      } else {
        newStatus = STATUS.FOCUSED;
      }
    }
    _setStatus(newStatus);
  }

  function _handleNoFace() {
    if (_awaySince === null) _awaySince = Date.now();
    if ((Date.now() - _awaySince) > AWAY_TIMEOUT * 1000) {
      _setStatus(STATUS.AWAY);
      eyeCloseStart = null;
      _detection.eyesClosed = false;
    }
  }

  function _drawDebug(lm) {
    var w = canvas.width, h = canvas.height;
    var allEyeIdx = LEFT_EYE_IDX.concat(RIGHT_EYE_IDX);

    for (var i = 0; i < lm.length; i++) {
      var isEye = allEyeIdx.indexOf(i) !== -1;
      ctx.beginPath();
      ctx.arc(_mx(lm[i].x) * w, lm[i].y * h, isEye ? 2 : 1, 0, Math.PI * 2);
      ctx.fillStyle = isEye ? '#00ffdd' : (i < 200 ? '#00ff88' : 'rgba(0,255,136,0.3)');
      ctx.fill();
    }

    ctx.fillStyle = _detection.eyesClosed ? '#ff4444' : (_detection.headTurned ? '#ffaa00' : '#00ff88');
    ctx.font = '12px monospace';
    ctx.fillText('EAR:' + _detection.ear + ' Turn:' + _detection.turnRatio + ' Score:' + Math.round(_focusScore), 10, h - 10);
  }

  function _setStatus(newStatus) {
    if (_status !== newStatus) {
      var prev = _status;
      _status = newStatus;
      _statusCallbacks.forEach(function(cb) { cb(newStatus); });
      if (window.FocusBuddyEvents) {
        window.FocusBuddyEvents.dispatchEvent(
          new CustomEvent('vision:status-changed', { detail: { status:newStatus, prev:prev } })
        );
      }
      if (window.FocusBuddyUI) {
        window.FocusBuddyUI.updateVisionStatus(newStatus);
      }
    }
  }

  // ===== 帧循环 =====
  function _loop() {
    if (!isRunning) return;
    if (video.readyState >= 2 && faceMesh) {
      faceMesh.send({ image: video }).catch(function() {});
    }
    loopTimer = setTimeout(_loop, 100);
  }

  // ===== 公开 API =====
  function start() { if (isRunning) return; isRunning = true; _status = STATUS.LOADING; _loop(); }
  function stop() { isRunning = false; if (loopTimer) clearTimeout(loopTimer); loopTimer = null; }

  function getStatus() { return _status; }
  function getFaceAngle() {
    return { yaw:_detection.yaw, pitch:_detection.pitch, roll:_detection.roll, confidence:_detection.confidence };
  }
  function getEAR() { return _detection.ear; }
  function getTurnRatio() { return _detection.turnRatio; }
  function getEyesClosed() { return _detection.eyesClosed; }
  function getHeadTurned() { return _detection.headTurned; }
  function getFocusScore() { return Math.round(_focusScore); }
  function getDetection() {
    var r = {};
    for (var k in _detection) r[k] = _detection[k];
    r.focusScore = Math.round(_focusScore);
    return r;
  }
  function isReady() { return !!faceMesh && !!_stream; }
  function onStatusChange(cb) { _statusCallbacks.push(cb); }

  function setSensitivity(level) {
    if (SENSITIVITY_MAP[level]) _sensitivity = level;
  }

  function destroy() {
    stop();
    if (_stream) { _stream.getTracks().forEach(function(t) { t.stop(); }); }
  }

  window.FocusBuddyVision = {
    init: init, start: start, stop: stop,
    getStatus: getStatus, getFaceAngle: getFaceAngle,
    getEAR: getEAR, getTurnRatio: getTurnRatio,
    getEyesClosed: getEyesClosed, getHeadTurned: getHeadTurned,
    getFocusScore: getFocusScore, getDetection: getDetection,
    onStatusChange: onStatusChange, setSensitivity: setSensitivity,
    isReady: isReady, destroy: destroy
  };

})();
