/**
 * FocusBuddy - 番茄钟模块
 * 负责人: Ryan
 * 
 * 接口:
 *   new PomodoroTimer(options)
 *   start(), pause(), reset(), skip()
 *   事件: statechange, tick, complete
 */

(function() {
  'use strict';

  var STATES = { IDLE:'IDLE', FOCUSING:'FOCUSING', ON_BREAK:'ON_BREAK', PAUSED:'PAUSED' };

  function PomodoroTimer(options) {
    options = options || {};
    this.focusDuration = (options.focusDuration || 25) * 60; // 秒
    this.breakDuration = (options.breakDuration || 5) * 60;
    this.state = STATES.IDLE;
    this.remaining = this.focusDuration;
    this._interval = null;
    this.onStateChange = options.onStateChange || null;
    this.onTick = options.onTick || null;
    this.onComplete = options.onComplete || null;
  }

  PomodoroTimer.prototype.start = function() {
    if (this.state === STATES.FOCUSING || this.state === STATES.ON_BREAK) return;

    if (this.state === STATES.PAUSED) {
      this.state = this._wasFocusing ? STATES.FOCUSING : STATES.ON_BREAK;
    } else {
      this.state = STATES.FOCUSING;
      this.remaining = this.focusDuration;
    }

    this._tick();
    this._notifyState();
  };

  PomodoroTimer.prototype.pause = function() {
    if (this.state !== STATES.FOCUSING && this.state !== STATES.ON_BREAK) return;
    this._wasFocusing = (this.state === STATES.FOCUSING);
    this.state = STATES.PAUSED;
    if (this._interval) clearInterval(this._interval);
    this._notifyState();
  };

  PomodoroTimer.prototype.reset = function() {
    if (this._interval) clearInterval(this._interval);
    this.state = STATES.IDLE;
    this.remaining = this.focusDuration;
    this._notifyState();
  };

  PomodoroTimer.prototype.skip = function() {
    if (this.state === STATES.ON_BREAK) {
      // 跳过休息，直接开始下一轮
      if (this._interval) clearInterval(this._interval);
      this.state = STATES.IDLE;
      this.remaining = this.focusDuration;
      this._notifyState();
    }
  };

  PomodoroTimer.prototype._tick = function() {
    var self = this;
    if (self._interval) clearInterval(self._interval);

    self._interval = setInterval(function() {
      if (self.state !== STATES.FOCUSING && self.state !== STATES.ON_BREAK) {
        clearInterval(self._interval);
        return;
      }

      self.remaining--;

      if (self.onTick) self.onTick(self.remaining);

      if (self.remaining <= 0) {
        clearInterval(self._interval);
        self._onDone();
      }
    }, 1000);
  };

  PomodoroTimer.prototype._onDone = function() {
    if (this.state === STATES.FOCUSING) {
      // 专注完成 → 休息
      this.state = STATES.ON_BREAK;
      this.remaining = this.breakDuration;
      this._tick();
      if (this.onComplete) this.onComplete('focus');
    } else if (this.state === STATES.ON_BREAK) {
      // 休息完成 → 空闲
      this.state = STATES.IDLE;
      this.remaining = this.focusDuration;
      if (this.onComplete) this.onComplete('break');
    }
    this._notifyState();
  };

  PomodoroTimer.prototype._notifyState = function() {
    if (this.onStateChange) {
      this.onStateChange({ state:this.state, remaining:this.remaining });
    }
    if (window.FocusBuddyEvents) {
      window.FocusBuddyEvents.dispatchEvent(
        new CustomEvent('pomodoro:state-changed', {
          detail: { state:this.state, remaining:this.remaining }
        })
      );
    }
  };

  PomodoroTimer.prototype.getFormattedTime = function() {
    var m = Math.floor(this.remaining / 60);
    var s = this.remaining % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  PomodoroTimer.prototype.updateDurations = function(focusMin, breakMin) {
    this.focusDuration = focusMin * 60;
    this.breakDuration = breakMin * 60;
    if (this.state === STATES.IDLE || this.state === STATES.PAUSED) {
      this.remaining = this.focusDuration;
    }
  };

  window.PomodoroTimer = PomodoroTimer;
  window.PomodoroStates = STATES;

})();
