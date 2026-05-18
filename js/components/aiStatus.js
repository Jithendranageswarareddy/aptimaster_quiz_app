/*
  Purpose: Lightweight AI status UI for quiz sessions.
  Shows whether the session is using AI-generated or offline practice questions.
*/

const SOURCE_LABELS = {
  ai: 'AI Practice Mode',
  mock: 'Offline Practice Mode',
  fallback: 'Offline Practice Mode'
};

const SOURCE_DESCRIPTIONS = {
  ai: 'AI-powered question generation',
  mock: 'Randomized practice questions',
  fallback: 'Randomized practice questions'
};

export function renderAiStatus(source = 'ai', message = '') {
  const label = SOURCE_LABELS[source] || SOURCE_LABELS.ai;
  const description = SOURCE_DESCRIPTIONS[source] || '';

  return `
    <div class="ai-status ai-status--${source === 'fallback' || source === 'mock' ? 'offline' : 'ai'}" role="status" aria-live="polite">
      <span class="ai-status__pill">${label}</span>
      ${description ? `<span class="ai-status__description">${description}</span>` : ''}
      ${message ? `<p class="ai-status__message">${message}</p>` : ''}
    </div>
  `;
}
