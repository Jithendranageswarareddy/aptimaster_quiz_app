/*
  Purpose: Application bootstrap orchestration.
  Initializes shared state and routes to the active page controller.
*/

import { getRoute } from './router.js';
import { initHomePage } from '../pages/homePage.js';
import { initQuizPage } from '../pages/quizPage.js';
import { initResultPage } from '../pages/resultPage.js';

export function bootstrapApp() {
  const route = getRoute(window.location.pathname);

  if (route === 'home') initHomePage();
  if (route === 'quiz') initQuizPage();
  if (route === 'result') initResultPage();
}
