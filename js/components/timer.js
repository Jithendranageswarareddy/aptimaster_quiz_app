/*
  Purpose: Timer UI component.

  This component only handles DOM rendering and UI events.
  Countdown calculations are handled by timer engine logic.
*/

function formatTime(totalSeconds) {
  const safeValue = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function mountTimerUI(rootElement, handlers) {
  const { onPauseToggle, onReset } = handlers;

  rootElement.innerHTML = `
    <section class="timer card" aria-live="polite">
      <div class="timer__content">
        <p class="timer__label">Time</p>
        <p id="timer-value" class="timer__value">00:00</p>
      </div>

      <div class="timer__actions">
        <button id="timer-pause-btn" type="button" class="btn btn-secondary">Pause</button>
        <button id="timer-reset-btn" type="button" class="btn btn-secondary">Reset</button>
      </div>
    </section>
  `;

  const pauseButton = rootElement.querySelector('#timer-pause-btn');
  const resetButton = rootElement.querySelector('#timer-reset-btn');

  if (pauseButton) {
    pauseButton.addEventListener('click', onPauseToggle);
  }

  if (resetButton) {
    resetButton.addEventListener('click', onReset);
  }
}

export function updateTimerUI(rootElement, timerState) {
  const timerValue = rootElement.querySelector('#timer-value');
  const pauseButton = rootElement.querySelector('#timer-pause-btn');
  const timerPanel = rootElement.querySelector('.timer');

  if (!timerValue || !pauseButton || !timerPanel) return;

  timerValue.textContent = formatTime(timerState.remainingSeconds);
  pauseButton.textContent = timerState.isRunning ? 'Pause' : 'Resume';

  // Add visual warning when remaining time is low.
  const isLowTime = timerState.remainingSeconds <= 30;
  timerPanel.classList.toggle('timer--warning', isLowTime);
}
