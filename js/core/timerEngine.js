/*
  Purpose: Framework-independent countdown engine.

  Why this module is useful:
  - Keeps timer business logic outside UI files.
  - Makes timer reusable across pages/components.

  Features:
  - start, pause, reset controls
  - per-second countdown updates
  - completion callback when timer reaches 0
*/

export function createTimerEngine(config) {
  const {
    durationInSeconds,
    initialRemainingSeconds,
    onTick = () => {},
    onComplete = () => {}
  } = config;

  const safeDuration = Math.max(1, Number(durationInSeconds) || 1);

  const state = {
    durationInSeconds: safeDuration,
    remainingSeconds:
      typeof initialRemainingSeconds === 'number'
        ? Math.max(0, Math.min(safeDuration, Math.floor(initialRemainingSeconds)))
        : safeDuration,
    isRunning: false
  };

  let intervalId = null;

  function notifyTick() {
    onTick(getSnapshot());
  }

  function tick() {
    if (!state.isRunning) return;

    state.remainingSeconds -= 1;
    notifyTick();

    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      pause();
      onComplete(getSnapshot());
    }
  }

  function start() {
    if (state.isRunning || state.remainingSeconds <= 0) return;

    state.isRunning = true;
    intervalId = setInterval(tick, 1000);
    notifyTick();
  }

  function pause() {
    state.isRunning = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    notifyTick();
  }

  function reset(nextDurationInSeconds = safeDuration) {
    const resetDuration = Math.max(1, Number(nextDurationInSeconds) || safeDuration);

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    state.durationInSeconds = resetDuration;
    state.remainingSeconds = resetDuration;
    state.isRunning = false;
    notifyTick();
  }

  function dispose() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    state.isRunning = false;
  }

  function getSnapshot() {
    return {
      durationInSeconds: state.durationInSeconds,
      remainingSeconds: state.remainingSeconds,
      isRunning: state.isRunning
    };
  }

  return {
    start,
    pause,
    reset,
    dispose,
    getSnapshot
  };
}
