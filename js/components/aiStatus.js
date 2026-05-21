/*
  Purpose: Lightweight AI status UI for quiz sessions.
  Shows whether the session is using AI-generated or offline practice questions.
*/

const SOURCE_LABELS = {
  ai: 'AI Practice Mode',
  mock: 'Adaptive Practice Mode',
  fallback: 'Adaptive Practice Mode'
};

const SOURCE_DESCRIPTIONS = {
  ai: 'AI-powered question generation',
  mock: 'Smart practice session',
  fallback: 'Smart practice session'
};

export function renderAiStatus(source = 'ai', message = '') {
  const label = SOURCE_LABELS[source] || SOURCE_LABELS.ai;
  const description = SOURCE_DESCRIPTIONS[source] || '';

  const variant = source === 'fallback' || source === 'mock' ? 'adaptive' : 'ai';

  return `
    <div class="ai-status ai-status--${variant}" role="status" aria-live="polite">
      <span class="ai-status__pill">${label}</span>
      ${description ? `<span class="ai-status__description">${description}</span>` : ''}
      ${message ? `<p class="ai-status__message">${message}</p>` : ''}
    </div>
  `;
}
