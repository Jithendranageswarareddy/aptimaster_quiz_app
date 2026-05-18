/*
  Purpose: LocalStorage service for quiz result persistence.

  Workflow summary:
  1. Save latest result for quick dashboard display.
  2. Append each attempt into history with metadata.
  3. Expose reusable read/clear helpers for UI modules.
*/

import { safeReadStorage, safeWriteStorage, safeRemoveStorage } from '../core/runtimeConfig.js';

const RESULT_KEY = 'aptimaster_result';
const HISTORY_KEY = 'aptimaster_quiz_history';
const MAX_HISTORY_ITEMS = 30;

function safeReadJson(key, fallback) {
  const raw = safeReadStorage(key, null);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Invalid JSON for key: ${key}`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  safeWriteStorage(key, JSON.stringify(value));
}

export function saveResult(result) {
  writeJson(RESULT_KEY, result);
}

export function getSavedResult() {
  return safeReadJson(RESULT_KEY, null);
}

export function getQuizHistory() {
  return safeReadJson(HISTORY_KEY, []);
}

export function clearQuizHistory() {
  safeRemoveStorage(HISTORY_KEY);
}

export function saveQuizAttempt(result, metadata = {}) {
  const attempt = {
    score: result.score,
    total: result.total,
    percentage: result.percentage,
    category: metadata.category || 'mixed',
    topic: metadata.topic || '',
    difficulty: metadata.difficulty || 'medium',
    questionCount: metadata.questionCount || result.total || 0,
    timestamp: metadata.timestamp || new Date().toISOString()
  };

  // Save latest result card data.
  saveResult(result);

  // Insert newest attempt at top and trim list length.
  const history = getQuizHistory();
  history.unshift(attempt);
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
  writeJson(HISTORY_KEY, trimmed);
}
