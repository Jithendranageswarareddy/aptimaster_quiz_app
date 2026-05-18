/*
  Purpose: Reusable quiz rendering functions.
  Why separate helpers:
  - Keeps page controller focused on state and events.
  - Keeps HTML generation centralized and easy to edit.
*/

export function renderQuestionMeta(currentIndex, totalQuestions) {
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return `
    <div class="quiz-card__topline">
      <p class="quiz-card__meta" aria-live="polite">Question ${currentIndex + 1} of ${totalQuestions}</p>
      <p class="quiz-card__progress-label">${progressPercent}% complete</p>
    </div>
    <div class="quiz-progress" aria-hidden="true">
      <span class="quiz-progress__fill" style="width: ${progressPercent}%"></span>
    </div>
  `;
}

export function renderQuestionOptions(options, selectedOption) {
  return options
    .map((option) => {
      const isSelected = selectedOption === option;
      return `
        <button
          type="button"
          class="option-btn ${isSelected ? 'option-btn--selected' : ''}"
          data-option-value="${option}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
          aria-label="Select option: ${option}"
        >
          ${option}
        </button>
      `;
    })
    .join('');
}

export function renderQuizNavigation(currentIndex, totalQuestions, isNextDisabled) {
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return `
    <div class="quiz-nav">
      <button
        type="button"
        class="btn btn-secondary"
        data-action="previous"
        aria-label="Go to previous question"
        ${isFirstQuestion ? 'disabled' : ''}
      >
        Previous
      </button>

      <button
        type="button"
        class="btn"
        data-action="next"
        aria-label="${isLastQuestion ? 'Finish quiz and submit' : 'Go to next question'}"
        ${isNextDisabled ? 'disabled' : ''}
      >
        ${isLastQuestion ? 'Finish Quiz' : 'Next'}
      </button>
    </div>
  `;
}

export function renderQuizCard(
  questionObj,
  currentIndex,
  totalQuestions,
  selectedOption,
  feedbackMessage
) {
  const isNextDisabled = !selectedOption;

  return `
    <article class="quiz-card">
      ${renderQuestionMeta(currentIndex, totalQuestions)}
      <h3 class="quiz-card__question">${questionObj.question}</h3>

      <div class="quiz-card__options" role="group" aria-label="Answer options">
        ${renderQuestionOptions(questionObj.options, selectedOption)}
      </div>

      ${feedbackMessage ? `<p class="quiz-card__feedback">${feedbackMessage}</p>` : ''}

      ${renderQuizNavigation(currentIndex, totalQuestions, isNextDisabled)}
    </article>
  `;
}
