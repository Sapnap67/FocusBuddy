/**
 * FocusBuddy - FaceMesh 面部检测模块 v2.1
 * 检测算法全部移植自旧项目"专注力检测器" v1.7（已验证）
 *   - EAR 闭眼检测 (0.22阈值 + 800ms眨眼过滤)
 *   - headRatio 低头检测 (0.38阈值)
 *   - turnRatio 转头检测 (0.62阈值)
 *   - MAR 打哈欠检测 (0.6阈值 + 1200ms持续)
 *   - 专注度评分 (分心-0.15/帧, 专注+0.05/帧)
 * 暴露: window.FocusBuddyVision
 */

(function() {
  'use strict';

  var STATUS = {
    LOADING: 'loading', FOCUSED: 'focused', DISTRACTED: 'distracted',
    EYE_CLOSED: 'eye_closed', AWAY: 'away', IDLE: 'idle'
  };

  // ===== 检测阈值（来自旧项目，共用验证值）=====
  var EAR_THRESHOLD = 0.22, BLINK_FILTER_MS = 800;
  var TURN_THRESHOLD = 0.62, HEAD_THRESHOLD = 0.38;
  var MAR_THRESHOLD = 0.6, YAWN_MIN_MS = 1200;
  var AWAY_TIMEOUT = 10;

  var SENSITIVITY_MAP = {
    low:    { yaw: 40, pitch: 35, ear: 0.18, turn: 0.55 },
    medium: { yaw: 30, pitch: 25, ear: 0.22, turn: 0.62 },
    high:   { yaw: 20, pitch: 15, ear: 0.26, turn: 0.68 }
  };

  // FaceMesh 关键点索引
  var LEFT_EYE_IDX  = [33, 160, 158, 133, 153, 144];
  var RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380];

  // ===== 状态 =====
  var faceMesh = null, video = null, canvas = null, ctx = null, cameraSelect = null;
  var isRunning = false, loopTimer = null, _stream = null;
  var _status = STATUS.IDLE, _sensitivity = 'medium', _statusCallbacks = [], _awaySince = null;
  var eyeCloseStart = null, mouthOpenStart = null, _focusScore = 100;
  var _frameW = 640, _frameH = 480;

  var _detection = {
    yaw: 0, pitch: 0, roll: 0,
    ear: 1.0, turnRatio: 1.0, headRatio: 0.5, mar: 0,
    eyesClosed: false, headTurned: false, headDown: false, yawning: false,
    confidence: 0
  };

  // ===== 坐标辅助 =====
  function _dist(a, b) {
    return Math.hypot((a.x - b.x) * _frameW, (a.y - b.y) * _frameH);
  }
  function _mx(nx) { return 1 - nx; }

  function _calcEAR(lm, indices) {
    var p = indices.map(function(i) { return lm[i]; });
    return (_dist(p[1], p[5]) + _dist(p[2], p[4])) / (2 * _dist(p[0], p[3]) || 0.01);
  }

  // ===== 初始化 =====
  function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('overlay');
    ctx = canvas.getContext('2d');
    cameraSelect = document.getElementById('camera-select');
    if (typeof FaceMesh === 'undefined') return Promise.reject(new Error('FaceMesh 未加载'));
    faceMesh = new FaceMesh({ locateFile: function(f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f; } });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
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
      if (cams.length === 0) { var o = document.createElement('option'); o.textContent = '（无摄像头）'; cameraSelect.appendChild(o); }
    });
  }

  function _startCamera(deviceId) {
    if (_stream) { _stream.getTracks().forEach(function(t) { t.stop(); }); }
    return navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { ideal: deviceId } } : true, audio: false })
      .then(function(stream) {
        _stream = stream; video.srcObject = stream;
        return new Promise(function(resolve) {
          video.onloadedmetadata = function() {
            _frameW = video.videoWidth || 640; _frameH = video.videoHeight || 480;
            _resizeCanvas(); video.classList.add('mirrored'); resolve();
          };
        });
      });
  }

  cameraSelect.addEventListener('change', function() { if (this.value) _startCamera(this.value); });
  function _resizeCanvas() { var r = video.getBoundingClientRect(); canvas.width = r.width; canvas.height = r.height; }
  window.addEventListener('resize', _resizeCanvas);

  // ===== 核心检测（全部来自旧项目）=====
  function _onResults(results) {
    var lm = results.multiFaceLandmarks?.[0];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!lm) { _handleNoFace(); return; }
    _awaySince = null;

    _calcYawPitch(lm);
    _calcEyes(lm);
    _calcHeadTurn(lm);
    _calcHeadDown(lm);
    _calcYawn(lm);
    _calcFocusScore();
    _drawDebug(lm);
    _determineStatus();
  }

  function _calcYawPitch(lm) {
    var n = lm[1], le = lm[133], re = lm[362];
    var mx = (le.x + re.x) / 2, my = (le.y + re.y) / 2, ed = Math.hypot(re.x - le.x, re.y - le.y) || 0.01;
    _detection.yaw = Math.round((n.x - mx) / ed * 60 * 10) / 10;
    _detection.pitch = Math.round((n.y - my) / ed * 40 * 10) / 10;
    _detection.roll = Math.round(Math.atan2(re.y - le.y, re.x - le.x) * 180 / Math.PI * 10) / 10;
    _detection.confidence = 1.0;
  }

  function _calcEyes(lm) {
    _detection.ear = Math.round((_calcEAR(lm, LEFT_EYE_IDX) + _calcEAR(lm, RIGHT_EYE_IDX)) / 2 * 100) / 100;
    var sens = SENSITIVITY_MAP[_sensitivity];
    if (_detection.ear < sens.ear) {
      if (eyeCloseStart === null) eyeCloseStart = Date.now();
    } else { eyeCloseStart = null; }
    _detection.eyesClosed = eyeCloseStart !== null && (Date.now() - eyeCloseStart) >= BLINK_FILTER_MS;
  }

  function _calcHeadTurn(lm) {
    var n = lm[1], lc = lm[234], rc = lm[454];
    var nl = _dist(n, lc), nr = _dist(n, rc);
    _detection.turnRatio = Math.round(Math.min(nl, nr) / (Math.max(nl, nr) || 0.01) * 100) / 100;
    var sens = SENSITIVITY_MAP[_sensitivity];
    _detection.headTurned = _detection.turnRatio < sens.turn;
  }

  function _calcHeadDown(lm) {
    var nt = lm[1], fh = lm[10], ch = lm[152];
    var fhDist = _dist(fh, ch), ncDist = _dist(nt, ch);
    _detection.headRatio = Math.round(ncDist / (fhDist || 0.01) * 100) / 100;
    _detection.headDown = _detection.headRatio < HEAD_THRESHOLD;
  }

  function _calcYawn(lm) {
    var mt = lm[13], mb = lm[14], ml = lm[61], mr = lm[291];
    _detection.mar = Math.round(_dist(mt, mb) / (_dist(ml, mr) || 0.01) * 100) / 100;
    if (_detection.mar > MAR_THRESHOLD) {
      if (mouthOpenStart === null) mouthOpenStart = Date.now();
    } else { mouthOpenStart = null; }
    _detection.yawning = mouthOpenStart !== null && (Date.now() - mouthOpenStart) >= YAWN_MIN_MS;
  }

  function _calcFocusScore() {
    var distracted = _detection.eyesClosed || _detection.headTurned || _detection.headDown ||
      Math.abs(_detection.yaw) > SENSITIVITY_MAP[_sensitivity].yaw ||
      Math.abs(_detection.pitch) > SENSITIVITY_MAP[_sensitivity].pitch;
    _focusScore = distracted ? Math.max(0, _focusScore - 0.15) : Math.min(100, _focusScore + 0.05);
  }

  function _determineStatus() {
    var newStatus;
    if (_detection.eyesClosed) newStatus = STATUS.EYE_CLOSED;
    else if (_detection.headTurned || _detection.headDown) newStatus = STATUS.DISTRACTED;
    else {
      var s = SENSITIVITY_MAP[_sensitivity];
      newStatus = (Math.abs(_detection.yaw) > s.yaw || Math.abs(_detection.pitch) > s.pitch)
        ? STATUS.DISTRACTED : STATUS.FOCUSED;
    }
    _setStatus(newStatus);
  }

  function _handleNoFace() {
    if (_awaySince === null) _awaySince = Date.now();
    if ((Date.now() - _awaySince) > AWAY_TIMEOUT * 1000) {
      _setStatus(STATUS.AWAY);
      eyeCloseStart = null; mouthOpenStart = null;
      _detection.eyesClosed = false; _detection.yawning = false;
    }
  }

  function _drawDebug(lm) {
    var w = canvas.width, h = canvas.height;
    var allEye = LEFT_EYE_IDX.concat(RIGHT_EYE_IDX);
    for (var i = 0; i < lm.length; i++) {
      ctx.beginPath();
      ctx.arc(_mx(lm[i].x) * w, lm[i].y * h, allEye.indexOf(i) !== -1 ? 2 : 1, 0, Math.PI * 2);
      ctx.fillStyle = allEye.indexOf(i) !== -1 ? '#00ffdd' : (i < 200 ? '#00ff88' : 'rgba(0,255,136,0.3)');
      ctx.fill();
    }
    var d = _detection;
    ctx.fillStyle = d.eyesClosed ? '#ff4444' : (d.headTurned || d.headDown ? '#ffaa00' : '#00ff88');
    ctx.font = '12px monospace';
    ctx.fillText('EAR:' + d.ear + ' Turn:' + d.turnRatio + ' Head:' + d.headRatio + ' MAR:' + d.mar + ' Score:' + Math.round(_focusScore), 10, h - 10);
  }

  function _setStatus(newStatus) {
    if (_status !== newStatus) {
      var prev = _status; _status = newStatus;
      _statusCallbacks.forEach(function(cb) { cb(newStatus); });
      if (window.FocusBuddyEvents) window.FocusBuddyEvents.dispatchEvent(new CustomEvent('vision:status-changed', { detail: { status: newStatus, prev: prev } }));
      if (window.FocusBuddyUI) window.FocusBuddyUI.updateVisionStatus(newStatus);
    }
  }

  // ===== 帧循环 =====
  function _loop() { if (!isRunning) return; if (video.readyState >= 2 && faceMesh) faceMesh.send({ image: video }).catch(function() {}); loopTimer = setTimeout(_loop, 100); }

  // ===== API =====
  function start() { if (isRunning) return; isRunning = true; _status = STATUS.LOADING; _loop(); }
  function stop() { isRunning = false; if (loopTimer) clearTimeout(loopTimer); loopTimer = null; }
  function getStatus() { return _status; }
  function getFaceAngle() { return { yaw: _detection.yaw, pitch: _detection.pitch, roll: _detection.roll, confidence: _detection.confidence }; }
  function getEAR() { return _detection.ear; }
  function getTurnRatio() { return _detection.turnRatio; }
  function getEyesClosed() { return _detection.eyesClosed; }
  function getHeadTurned() { return _detection.headTurned; }
  function getHeadDown() { return _detection.headDown; }
  function getYawning() { return _detection.yawning; }
  function getFocusScore() { return Math.round(_focusScore); }
  function getDetection() { var r = {}; for (var k in _detection) r[k] = _detection[k]; r.focusScore = Math.round(_focusScore); return r; }
  function isReady() { return !!faceMesh && !!_stream; }
  function onStatusChange(cb) { _statusCallbacks.push(cb); }
  function setSensitivity(level) { if (SENSITIVITY_MAP[level]) _sensitivity = level; }
  function destroy() { stop(); if (_stream) _stream.getTracks().forEach(function(t) { t.stop(); }); }

  window.FocusBuddyVision = {
    init: init, start: start, stop: stop,
    getStatus: getStatus, getFaceAngle: getFaceAngle,
    getEAR: getEAR, getTurnRatio: getTurnRatio,
    getEyesClosed: getEyesClosed, getHeadTurned: getHeadTurned,
    getHeadDown: getHeadDown, getYawning: getYawning,
    getFocusScore: getFocusScore, getDetection: getDetection,
    onStatusChange: onStatusChange, setSensitivity: setSensitivity,
    isReady: isReady, destroy: destroy
  };

})();
