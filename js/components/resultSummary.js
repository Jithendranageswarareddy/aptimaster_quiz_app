/*
  Purpose: Reusable result dashboard renderers.
*/

export function renderMetricCard(label, value, tone = 'neutral') {
  return `
    <article class="result-metric-card result-metric-card--${tone}">
      <p class="result-metric-card__label">${label}</p>
      <p class="result-metric-card__value">${value}</p>
    </article>
  `;
}

function renderStatusBadge(status) {
  const safeStatus = String(status || 'beginner');
  return `<span class="result-status result-status--${safeStatus}">${safeStatus}</span>`;
}

function formatLabel(value, fallback = 'Mixed Practice') {
  const text = String(value || '').trim();
  if (!text) return fallback;

  return text
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderResultBadge(value, tone = 'neutral') {
  return `<span class="result-pill result-pill--${tone}">${value}</span>`;
}

export function renderAnswerReviewCard(item, index) {
  const explanation = String(item.explanation || '').trim();

  return `
    <article class="result-answer-card ${item.isCorrect ? 'is-correct' : 'is-wrong'}">
      <div class="result-answer-card__head">
        <p class="result-answer-card__title">Q${index + 1}. ${item.questionText}</p>
        ${renderResultBadge(item.isCorrect ? 'Correct' : 'Review', item.isCorrect ? 'success' : 'danger')}
      </div>
      <div class="answer-pair">
        <p><span>Selected</span>${item.selectedAnswer}</p>
        <p><span>Correct</span>${item.correctAnswer}</p>
      </div>
      ${
        explanation
          ? `<p class="answer-explanation"><strong>Why:</strong> ${explanation}</p>`
          : ''
      }
    </article>
  `;
}

export function renderHistoryAttemptCard(attempt, index) {
  const localTime = new Date(attempt.timestamp).toLocaleString();

  return `
    <article class="history-attempt-card">
      <div class="history-attempt-card__top">
        <p class="history-attempt-card__title">Practice Session ${index + 1}</p>
        <p class="history-attempt-card__score">${attempt.percentage}%</p>
      </div>
      <div class="history-attempt-card__badges">
        ${renderResultBadge(formatLabel(attempt.category), 'primary')}
        ${renderResultBadge(formatLabel(attempt.difficulty, 'Medium'), 'neutral')}
      </div>
      <p class="history-attempt-card__topic">${formatLabel(attempt.topic, 'All Topics')}</p>
      <p class="history-attempt-card__meta">${attempt.score} / ${attempt.total} correct - ${attempt.questionCount} questions</p>
      <p class="history-attempt-card__time">${localTime}</p>
    </article>
  `;
}

export function renderHistorySection(history) {
  if (!history || history.length === 0) {
    return `
      <article class="card history-section">
        <div class="history-section__head">
          <h3>Practice History</h3>
        </div>
        <p class="history-empty">Complete a session to start building your progress history.</p>
      </article>
    `;
  }

  const historyHtml = history.map((attempt, index) => renderHistoryAttemptCard(attempt, index)).join('');

  return `
    <article class="card history-section">
      <div class="history-section__head">
        <h3>Practice History</h3>
        <button type="button" class="btn btn-secondary" data-action="clear-history">
          Clear History
        </button>
      </div>
      <div class="history-grid">
        ${historyHtml}
      </div>
    </article>
  `;
}

export function renderResultSummary(result, history = []) {
  const metricsHtml = [
    renderMetricCard('Total Score', `${result.score} / ${result.total}`, 'primary'),
    renderMetricCard('Correct Answers', String(result.correctAnswers || 0), 'success'),
    renderMetricCard('Wrong Answers', String(result.wrongAnswers || 0), 'danger'),
    renderMetricCard('Percentage', `${result.percentage || 0}%`, 'neutral')
  ].join('');

  const answerReviewHtml = (result.answerReview || [])
    .map((item, index) => renderAnswerReviewCard(item, index))
    .join('');

  return `
    <section class="result-dashboard">
      <article class="result-dashboard__header card">
        <div>
          <p class="section-eyebrow">Session Result</p>
          <h2>Performance Dashboard</h2>
        </div>
        <p class="result-dashboard__status">
          Performance Level: ${renderStatusBadge(result.performanceStatus)}
        </p>
        <p class="result-dashboard__score-highlight">${result.percentage || 0}%</p>
        <p class="result-dashboard__tip">${result.aiSuggestion}</p>
      </article>

      <section class="result-metrics-grid">
        ${metricsHtml}
      </section>

      <article class="card result-actions">
        <a class="btn" href="./quiz.html">Restart Quiz</a>
        <a class="btn btn-secondary" href="../index.html">Back to Home</a>
      </article>

      <article class="card">
        <h3>Answer Review</h3>
        <div class="result-answer-grid">
          ${answerReviewHtml || '<p>No answers available for review.</p>'}
        </div>
      </article>

      ${renderHistorySection(history)}
    </section>
  `;
}
