/**
 * FocusBuddy - 主控制器 + 状态机
 * 负责人: Vickie (集成 Ryan 的模块)
 * 
 * 加载顺序: facemesh.js → esp32.js → pomodoro.js → stats.js → settings.js → app.js
 * 所有模块通过 window 全局对象通信
 */

(function() {
  'use strict';

  // ===== 事件总线 =====
  window.FocusBuddyEvents = new EventTarget();

  // ===== 状态机 =====
  var AppState = {
    vision: 'idle',        // idle|loading|focused|distracted|away
    pomodoro: 'IDLE',      // IDLE|FOCUSING|ON_BREAK|PAUSED
    isRunning: false,      // 整体是否运行中
    distractionTimer: null,
    distractionStart: null,
    focusStart: null
  };

  var pomodoroTimer = null;

  // ===== UI 更新（Ryan 的 FocusBuddyUI） =====
  window.FocusBuddyUI = {
    updateVisionStatus: function(status) {
      var dot = document.getElementById('vision-status-dot');
      var text = document.getElementById('vision-status');
      if (!dot || !text) return;

      dot.className = 'status-dot';
      switch(status) {
        case 'focused':
          dot.classList.add('bg-focused');
          text.textContent = '专注中';
          break;
        case 'distracted':
          dot.classList.add('bg-distracted');
          text.textContent = '走神了';
          break;
        case 'eye_closed':
          dot.classList.add('bg-away');
          text.textContent = '闭眼/瞌睡';
          break;
        case 'away':
          dot.classList.add('bg-away');
          text.textContent = '离开屏幕';
          break;
        case 'loading':
          dot.classList.add('bg-idle');
          text.textContent = '加载中...';
          break;
        default:
          dot.classList.add('bg-idle');
          text.textContent = '未开始';
      }
    },

    updateFaceAngle: function(angle) {
      var display = document.getElementById('face-angle-display');
      if (display) {
        display.textContent = 'Yaw:' + angle.yaw + '° Pitch:' + angle.pitch + '° Roll:' + angle.roll + '°';
        display.classList.remove('hidden');
      }
    },

    showWarning: function(msg) {
      var banner = document.createElement('div');
      banner.className = 'warning-banner';
      banner.textContent = msg || '👀 检测到走神，回来学习啦~';
      document.body.appendChild(banner);
      setTimeout(function() { banner.remove(); }, 3000);
    },

    showCelebration: function() {
      var el = document.createElement('div');
      el.className = 'celebration';
      el.textContent = '🎉';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 2000);

      // 桌面通知
      if (window.SettingsManager?.getSettings()?.notifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('FocusBuddy', { body:'🎉 番茄钟完成！休息一下吧！' });
        }
      }
    },

    updateStats: function() {
      var today = window.StatsManager.getToday();
      var el = {
        pomodoros: document.getElementById('stats-pomodoros'),
        focusTime: document.getElementById('stats-focus-time'),
        distractions: document.getElementById('stats-distractions'),
        focusRate: document.getElementById('stats-focus-rate')
      };
      if (el.pomodoros) el.pomodoros.textContent = today.pomodoros;
      if (el.focusTime) el.focusTime.textContent = window.StatsManager.formatTime(today.focusTime);
      if (el.distractions) el.distractions.textContent = today.distractions;
      if (el.focusRate) el.focusRate.textContent = window.StatsManager.getFocusRate() + '%';
    },

    updatePomodoroDisplay: function(state, remaining) {
      var label = document.getElementById('pomodoro-label');
      var timer = document.getElementById('pomodoro-timer');
      var btnStart = document.getElementById('btn-pomodoro-start');
      var btnPause = document.getElementById('btn-pomodoro-pause');

      if (timer && pomodoroTimer) {
        timer.textContent = pomodoroTimer.getFormattedTime();
      }

      if (label) {
        switch(state) {
          case 'FOCUSING': label.textContent = '🍅 专注时间'; break;
          case 'ON_BREAK': label.textContent = '☕ 休息时间'; break;
          case 'PAUSED': label.textContent = '⏸ 已暂停'; break;
          default: label.textContent = '准备开始';
        }
      }

      if (btnStart) btnStart.disabled = (state === 'FOCUSING' || state === 'ON_BREAK');
      if (btnPause) btnPause.disabled = (state !== 'FOCUSING' && state !== 'ON_BREAK');
    },

    notifyPomodoroComplete: function(type) {
      if (type === 'focus') {
        window.StatsManager.addPomodoro();
        window.FocusBuddyUI.updateStats();
        window.FocusBuddyUI.showCelebration();
        // ESP32 庆祝
        if (window.ESP32) window.ESP32.syncPet('celebrate');
      }
    }
  };

  // ===== 番茄钟初始化 =====
  function _initPomodoro() {
    var settings = window.SettingsManager.getSettings();
    pomodoroTimer = new PomodoroTimer({
      focusDuration: settings.focusDuration,
      breakDuration: settings.breakDuration,
      onStateChange: function(data) {
        AppState.pomodoro = data.state;
        window.FocusBuddyUI.updatePomodoroDisplay(data.state, data.remaining);
      },
      onTick: function(remaining) {
        window.FocusBuddyUI.updatePomodoroDisplay(AppState.pomodoro, remaining);
      },
      onComplete: function(type) {
        window.FocusBuddyUI.notifyPomodoroComplete(type);
      }
    });
  }

  // ===== 按钮绑定 =====
  function _bindButtons() {
    document.getElementById('btn-pomodoro-start')?.addEventListener('click', function() {
      if (!window.FocusBuddyVision?.isReady()) {
        alert('请先等待摄像头就绪');
        return;
      }
      if (AppState.pomodoro === 'IDLE') {
        window.FocusBuddyVision.start();
        AppState.focusStart = Date.now();
      }
      pomodoroTimer.start();
      AppState.isRunning = true;
    });

    document.getElementById('btn-pomodoro-pause')?.addEventListener('click', function() {
      pomodoroTimer.pause();
      if (AppState.isRunning) {
        // 记录专注时段
        _recordFocusSession();
      }
    });

    document.getElementById('btn-pomodoro-reset')?.addEventListener('click', function() {
      _recordFocusSession();
      pomodoroTimer.reset();
      AppState.isRunning = false;
      window.FocusBuddyVision?.stop();
    });

    document.getElementById('btn-pomodoro-skip')?.addEventListener('click', function() {
      pomodoroTimer.skip();
    });
  }

  function _recordFocusSession() {
    if (AppState.focusStart && AppState.isRunning) {
      var elapsed = Math.floor((Date.now() - AppState.focusStart) / 1000);
      if (elapsed > 10) {
        window.StatsManager.addFocusSession(elapsed);
        window.FocusBuddyUI.updateStats();
      }
      AppState.focusStart = Date.now();
    }
  }

  // ===== 视觉状态变化处理 =====
  function _onVisionStatusChange(status) {
    AppState.vision = status;

    // 更新面部角度
    var angle = window.FocusBuddyVision.getFaceAngle();
    window.FocusBuddyUI.updateFaceAngle(angle);

    // 走神检测
    if (status === 'distracted') {
      if (!AppState.distractionStart) {
        AppState.distractionStart = Date.now();
      }
      // 超过30秒弹出提示
      var elapsed = (Date.now() - AppState.distractionStart) / 1000;
      if (elapsed > 30 && !AppState._warnedDistraction) {
        AppState._warnedDistraction = true;
        window.FocusBuddyUI.showWarning('👀 你走神超过30秒了，快回来！');
      }
    } else if (status === 'focused') {
      if (AppState.distractionStart) {
        var dur = (Date.now() - AppState.distractionStart) / 1000;
        window.StatsManager.addDistraction(dur, dur);
        window.FocusBuddyUI.updateStats();
        AppState.distractionStart = null;
        AppState._warnedDistraction = false;
      }
    } else if (status === 'eye_closed') {
      if (!AppState._warnedEyeClosed) {
        AppState._warnedEyeClosed = true;
        window.FocusBuddyUI.showWarning('😴 检测到闭眼，你是不是困了？');
      }
    } else if (status === 'focused') {
      AppState._warnedEyeClosed = false;
    } else if (status === 'away') {
      window.FocusBuddyUI.showWarning('检测到您离开屏幕，番茄钟已暂停');
      if (pomodoroTimer && (AppState.pomodoro === 'FOCUSING' || AppState.pomodoro === 'ON_BREAK')) {
        pomodoroTimer.pause();
      }
      if (window.ESP32) window.ESP32.alertBlink();
    }

    // ESP32 同步
    if (window.ESP32) window.ESP32.syncPet(status);
  }

  // ===== 设置变更处理 =====
  function _onSettingsChanged(settings) {
    if (window.FocusBuddyVision) {
      window.FocusBuddyVision.setSensitivity(settings.sensitivity);
    }
    if (pomodoroTimer) {
      pomodoroTimer.updateDurations(settings.focusDuration, settings.breakDuration);
      window.FocusBuddyUI.updatePomodoroDisplay(AppState.pomodoro, pomodoroTimer.remaining);
    }
  }

  // ===== 通知权限 =====
  function _requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ===== 启动 =====
  function init() {
    _initPomodoro();
    _bindButtons();
    _requestNotificationPermission();

    // 注册状态回调
    if (window.FocusBuddyVision) {
      window.FocusBuddyVision.onStatusChange(_onVisionStatusChange);
      window.FocusBuddyVision.init().then(function() {
        window.FocusBuddyUI.updateVisionStatus('idle');
      }).catch(function(err) {
        console.error('[App] 初始化失败:', err);
        window.FocusBuddyUI.updateVisionStatus('idle');
      });
    }

    // 设置变更回调
    if (window.SettingsManager) {
      window.SettingsManager.onChange(_onSettingsChanged);
    }

    // 初始更新统计
    window.FocusBuddyUI.updateStats();
    window.FocusBuddyUI.updatePomodoroDisplay('IDLE', pomodoroTimer.focusDuration);
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
