/**
 * FocusBuddy - 统计管理模块
 * 负责人: Ryan
 * 
 * 接口:
 *   window.StatsManager
 *   addFocusSession(seconds)
 *   addDistraction(duration, seconds)
 *   addPomodoro()
 *   getToday() → { focusTime, distractions, pomodoros, distractionTime, sessions }
 *   getHistory(days) → [{ date, ... }]
 */

(function() {
  'use strict';

  var STORAGE_PREFIX = 'focusbuddy_stats_';

  function getDateKey(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function loadDay(dateKey) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + dateKey);
      return raw ? JSON.parse(raw) : _emptyDay();
    } catch(e) {
      return _emptyDay();
    }
  }

  function saveDay(dateKey, data) {
    try {
      localStorage.setItem(STORAGE_PREFIX + dateKey, JSON.stringify(data));
    } catch(e) {
      console.warn('[Stats] localStorage 写入失败', e);
    }
  }

  function _emptyDay() {
    return {
      focusTime: 0,        // 专注总秒数
      distractions: 0,     // 走神次数
      pomodoros: 0,        // 完成番茄数
      distractionTime: 0,  // 走神总秒数
      sessions: []         // [{ start, end, type, focusSeconds }]
    };
  }

  function addFocusSession(seconds) {
    var key = getDateKey();
    var data = loadDay(key);
    data.focusTime += seconds;
    data.sessions.push({
      start: Date.now() - seconds * 1000,
      end: Date.now(),
      type: 'focus',
      focusSeconds: seconds
    });
    saveDay(key, data);
  }

  function addDistraction(duration, seconds) {
    var key = getDateKey();
    var data = loadDay(key);
    data.distractions++;
    data.distractionTime += (seconds || 0);
    if (duration) {
      data.sessions.push({
        start: Date.now() - duration * 1000,
        end: Date.now(),
        type: 'distraction',
        focusSeconds: 0
      });
    }
    saveDay(key, data);
  }

  function addPomodoro() {
    var key = getDateKey();
    var data = loadDay(key);
    data.pomodoros++;
    saveDay(key, data);
  }

  function getToday() {
    return loadDay(getDateKey());
  }

  function getHistory(days) {
    days = days || 7;
    var result = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      var key = getDateKey(d);
      var data = loadDay(key);
      result.push({
        date: key,
        focusTime: data.focusTime,
        distractions: data.distractions,
        pomodoros: data.pomodoros
      });
    }
    return result;
  }

  function formatTime(seconds) {
    if (seconds < 60) return seconds + 's';
    var m = Math.floor(seconds / 60);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    m = m % 60;
    return h + 'h ' + m + 'm';
  }

  function getFocusRate() {
    var today = getToday();
    var total = today.focusTime + today.distractionTime;
    if (total === 0) return 0;
    return Math.round(today.focusTime / total * 100);
  }

  window.StatsManager = {
    addFocusSession: addFocusSession,
    addDistraction: addDistraction,
    addPomodoro: addPomodoro,
    getToday: getToday,
    getHistory: getHistory,
    formatTime: formatTime,
    getFocusRate: getFocusRate
  };

})();
