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

  // ─── Chart.js 图表 ───
  var _pieChart = null;
  var _barChart = null;

  function initCharts() {
    if (typeof Chart === 'undefined' || _pieChart) return;

    var today = getToday();

    // 饼图: 专注 vs 走神
    var pieEl = document.getElementById('chart-pie');
    if (pieEl) {
      _pieChart = new Chart(pieEl, {
        type: 'pie',
        data: {
          labels: ['专注', '走神'],
          datasets: [{
            data: [today.focusTime || 1, today.distractionTime || 0.1],
            backgroundColor: ['#27ae60', '#f39c12'],
            borderColor: '#16213e',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: '#8892b0' } } }
        }
      });
    }

    // 柱状图: 近7天专注时长
    var barEl = document.getElementById('chart-bar');
    if (barEl) {
      var history = getHistory(7);
      _barChart = new Chart(barEl, {
        type: 'bar',
        data: {
          labels: history.map(function(d) { return d.date.slice(5); }),
          datasets: [{
            label: '专注 (min)',
            data: history.map(function(d) { return Math.round(d.focusTime / 60); }),
            backgroundColor: '#ff6b35',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8892b0' } },
            y: { beginAtZero: true, ticks: { color: '#8892b0', stepSize: 10 } }
          }
        }
      });
    }
  }

  function updateCharts() {
    if (!_pieChart && !_barChart) return;

    var today = getToday();

    if (_pieChart) {
      _pieChart.data.datasets[0].data = [today.focusTime || 1, today.distractionTime || 0.1];
      _pieChart.update();
    }

    if (_barChart) {
      var history = getHistory(7);
      _barChart.data.labels = history.map(function(d) { return d.date.slice(5); });
      _barChart.data.datasets[0].data = history.map(function(d) { return Math.round(d.focusTime / 60); });
      _barChart.update();
    }
  }

  // ─── 音效 ───
  function playSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch(e) { /* audio not available */ }
  }

  window.StatsManager = {
    addFocusSession: addFocusSession,
    addDistraction: addDistraction,
    addPomodoro: addPomodoro,
    getToday: getToday,
    getHistory: getHistory,
    formatTime: formatTime,
    getFocusRate: getFocusRate,
    initCharts: initCharts,
    updateCharts: updateCharts,
    playSound: playSound
  };

})();
