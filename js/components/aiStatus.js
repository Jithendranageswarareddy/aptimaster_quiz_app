/*
  Purpose: Lightweight AI status UI for quiz sessions.
  Shows whether the session is using AI-generated or ready practice questions.
*/

const SOURCE_LABELS = {
  ai: 'AI Practice',
  mock: 'Practice Ready',
  fallback: 'Practice Ready'
};

export function renderAiStatus(source = 'ai', message = '') {
  const label = SOURCE_LABELS[source] || SOURCE_LABELS.ai;

  return `
    <div class="ai-status ai-status--${source === 'mock' ? 'mock' : 'ai'}" role="status" aria-live="polite">
      <span class="ai-status__pill">${label}</span>
      ${message ? `<p class="ai-status__message">${message}</p>` : ''}
    </div>
  `;
}
