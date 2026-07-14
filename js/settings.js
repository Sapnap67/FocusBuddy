/**
 * FocusBuddy - 设置面板模块
 * 负责人: Ryan
 * 
 * 接口:
 *   window.SettingsManager
 *   getSettings() → { focusDuration, breakDuration, sensitivity, notifications }
 *   load() → 从 localStorage 恢复
 *   save() → 写入 localStorage
 *   onChange(callback)
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'focusbuddy_settings';
  var DEFAULTS = {
    focusDuration: 25,
    breakDuration: 5,
    sensitivity: 'medium',
    notifications: true
  };

  var settings = Object.assign({}, DEFAULTS);
  var callbacks = [];

  function _getElements() {
    return {
      panel: document.getElementById('settings-panel'),
      open: document.getElementById('btn-settings-open'),
      close: document.getElementById('btn-settings-close'),
      focusDur: document.getElementById('setting-focus-duration'),
      breakDur: document.getElementById('setting-break-duration'),
      sensitivity: document.getElementById('setting-sensitivity'),
      notifications: document.getElementById('setting-notifications')
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.assign(settings, saved);
      }
    } catch(e) {}

    // 同步到 UI
    var el = _getElements();
    if (el.focusDur) el.focusDur.value = settings.focusDuration;
    if (el.breakDur) el.breakDur.value = settings.breakDuration;
    if (el.sensitivity) el.sensitivity.value = settings.sensitivity;
    if (el.notifications) el.notifications.checked = settings.notifications;

    _updateRangeLabels();
  }

  function save() {
    var el = _getElements();
    settings.focusDuration = parseInt(el.focusDur?.value) || 25;
    settings.breakDuration = parseInt(el.breakDur?.value) || 5;
    settings.sensitivity = el.sensitivity?.value || 'medium';
    settings.notifications = el.notifications?.checked ?? true;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch(e) {}

    _notify();
    _updateRangeLabels();
  }

  function _updateRangeLabels() {
    var el = _getElements();
    if (el.focusDur) {
      var label = el.focusDur.parentNode.querySelector('.range-value');
      if (label) label.textContent = el.focusDur.value;
    }
    if (el.breakDur) {
      var label = el.breakDur.parentNode.querySelector('.range-value');
      if (label) label.textContent = el.breakDur.value;
    }
  }

  function getSettings() {
    return Object.assign({}, settings);
  }

  function onChange(cb) {
    callbacks.push(cb);
  }

  function _notify() {
    callbacks.forEach(function(cb) { cb(getSettings()); });
    if (window.FocusBuddyEvents) {
      window.FocusBuddyEvents.dispatchEvent(
        new CustomEvent('settings:changed', { detail: getSettings() })
      );
    }
  }

  function _initUI() {
    var el = _getElements();

    el.open?.addEventListener('click', function() {
      el.panel.classList.remove('hidden');
    });

    el.close?.addEventListener('click', function() {
      el.panel.classList.add('hidden');
      save();
    });

    el.panel?.addEventListener('click', function(e) {
      if (e.target === el.panel) {
        el.panel.classList.add('hidden');
        save();
      }
    });

    el.focusDur?.addEventListener('input', _updateRangeLabels);
    el.breakDur?.addEventListener('input', _updateRangeLabels);

    el.focusDur?.addEventListener('change', save);
    el.breakDur?.addEventListener('change', save);
    el.sensitivity?.addEventListener('change', save);
    el.notifications?.addEventListener('change', save);
  }

  _initUI();
  load();

  window.SettingsManager = {
    getSettings: getSettings,
    load: load,
    save: save,
    onChange: onChange
  };

})();
