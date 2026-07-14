/**
 * FocusBuddy - ESP32 WiFi 通信模块
 * 负责人: Vickie
 * 
 * 通信协议:
 *   ESP32 AP: FocusBuddy / 12345678
 *   IP: 10.10.10.1
 *   GET /pet?state=happy|worried|angry|sleep|celebrate
 *   GET /alert
 *   GET /status
 */

(function() {
  'use strict';

  var ESP32_URL = 'http://10.10.10.1';
  var CONNECTED = false;

  function setUrl(url) {
    ESP32_URL = url;
  }

  function _fetch(endpoint) {
    return fetch(ESP32_URL + endpoint, { mode:'no-cors' })
      .then(function() {
        CONNECTED = true;
      })
      .catch(function() {
        CONNECTED = false;
        console.warn('[ESP32] 连接失败');
      });
  }

  function setPet(state) {
    return _fetch('/pet?state=' + state);
  }

  function alertBlink() {
    return _fetch('/alert');
  }

  function getStatus() {
    return fetch(ESP32_URL + '/status')
      .then(function(r) { return r.json(); })
      .catch(function() {
        CONNECTED = false;
        return { connected: false };
      });
  }

  function isConnected() {
    return CONNECTED;
  }

  // 宠物状态 ↔ ESP32 映射
  var PET_MAP = {
    focused: 'happy',
    distracted: 'worried',
    away: 'sleep',
    idle: 'sleep',
    celebrate: 'celebrate'
  };

  function syncPet(status) {
    var espState = PET_MAP[status] || 'sleep';
    return setPet(espState);
  }

  function sendTimer(minutes, seconds) {
    var m = Math.min(99, Math.max(0, Math.floor(minutes)));
    var s = Math.min(59, Math.max(0, Math.floor(seconds)));
    return _fetch('/timer?m=' + m + '&s=' + s);
  }

  window.ESP32 = {
    setUrl: setUrl,
    setPet: setPet,
    alertBlink: alertBlink,
    getStatus: getStatus,
    isConnected: isConnected,
    syncPet: syncPet,
    sendTimer: sendTimer
  };

})();
