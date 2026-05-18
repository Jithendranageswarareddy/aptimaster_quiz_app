/*
  Purpose: Result page controller.
  Reads saved result and renders summary components.
*/

import { getSavedResult, getQuizHistory, clearQuizHistory } from '../services/storageService.js';
import { renderResultSummary } from '../components/resultSummary.js';
import { byId } from '../utils/helpers.js';

export function initResultPage() {
  const root = byId('result-root');
  if (!root) return;

  renderDashboard();

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.getAttribute('data-action');
    if (action === 'clear-history') {
      clearQuizHistory();
      renderDashboard();
    }
  });

  function renderDashboard() {
    const result = getSavedResult() || {
      score: 0,
      total: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      percentage: 0,
      performanceStatus: 'beginner',
      answerReview: [],
      aiSuggestion: 'Complete a quiz to view personalized suggestions.'
    };

    const history = getQuizHistory();
    root.innerHTML = renderResultSummary(result, history);
  }
}
