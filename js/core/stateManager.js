/*
  Purpose: Persist and restore quiz session state.

  Why this module exists:
  - UI files should not directly manage localStorage details.
  - This keeps persistence logic reusable and beginner-friendly.
*/

import { safeReadStorage, safeWriteStorage, safeRemoveStorage } from './runtimeConfig.js';

const QUIZ_STATE_KEY = 'aptimaster_quiz_state';

export function saveQuizState(state) {
  safeWriteStorage(QUIZ_STATE_KEY, JSON.stringify(state));
}

export function loadQuizState() {
  const raw = safeReadStorage(QUIZ_STATE_KEY, null);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Saved quiz state is invalid and will be ignored.', error);
    return null;
  }
}

export function clearQuizState() {
  safeRemoveStorage(QUIZ_STATE_KEY);
}
