/*
  Purpose: Business logic layer for quiz operations.
  Combines API calls and domain logic for page modules.
*/

import { fetchQuestions, fetchMockQuestions, submitAnswers } from '../api/quizApi.js';
import { buildQuizResult } from '../core/scoreManager.js';
import { safeReadStorage, safeRemoveStorage, safeWriteStorage } from '../core/runtimeConfig.js';

const AI_FALLBACK_MESSAGE = 'A fresh practice set is ready.';

function getAiCacheKey(setup = {}) {
  const category = setup.category || 'mixed';
  const topic = setup.topic || 'all';
  const difficulty = setup.difficulty || 'medium';
  const questionCount = Number(setup.questionCount) || 10;

  return `aptimaster_ai_questions_${category}_${topic}_${difficulty}_${questionCount}`;
}

function saveAiQuestionCache(setup, questions) {
  if (!Array.isArray(questions) || questions.length === 0) return;

  safeWriteStorage(
    getAiCacheKey(setup),
    JSON.stringify({
      savedAt: new Date().toISOString(),
      questions
    })
  );
}

function readAiQuestionCache(setup) {
  const raw = safeReadStorage(getAiCacheKey(setup), '');
  if (!raw) return [];

  try {
    const cached = JSON.parse(raw);
    return Array.isArray(cached.questions) ? cached.questions : [];
  } catch (error) {
    console.warn('[AptiMaster AI] Cached AI questions could not be parsed.', error);
    return [];
  }
}

function setActiveQuestionSource(source, fallbackMessage = '') {
  safeWriteStorage('aptimaster_question_source', source);

  if (fallbackMessage) {
    safeWriteStorage('aptimaster_ai_fallback_message', fallbackMessage);
    return;
  }

  safeRemoveStorage('aptimaster_ai_fallback_message');
}

export async function getQuizQuestions(setup, options = {}) {
  const source = options.source || 'openrouter';

  if (source === 'mock') {
    setActiveQuestionSource('mock');
    return fetchMockQuestions(setup);
  }

  try {
    const questions = await fetchQuestions(setup);
    setActiveQuestionSource('ai');
    saveAiQuestionCache(setup, questions);
    return questions;
  } catch (error) {
    // Safe fallback for deployed environments where no API key is configured.
    if (error?.code === 'MISSING_OPENROUTER_API_KEY') {
      console.warn('[AptiMaster AI] Fallback activated: missing OpenRouter API key.');
      setActiveQuestionSource('mock', AI_FALLBACK_MESSAGE);
      return fetchMockQuestions(setup);
    }

    if (
      [
        'OPENROUTER_INVALID_JSON',
        'OPENROUTER_EMPTY_RESPONSE',
        'OPENROUTER_INVALID_QUESTION_SCHEMA',
        'OPENROUTER_TIMEOUT',
        'OPENROUTER_NETWORK_ERROR',
        'OPENROUTER_HTTP_ERROR',
        'OPENROUTER_RATE_LIMIT',
        'OPENROUTER_RETRY_LIMIT_EXCEEDED'
      ].includes(error?.code)
    ) {
      const cachedAiQuestions = readAiQuestionCache(setup);
      if (cachedAiQuestions.length > 0) {
        console.warn('[AptiMaster AI] Using cached AI questions after OpenRouter failure.', {
          code: error?.code,
          cachedQuestions: cachedAiQuestions.length
        });
        setActiveQuestionSource('ai');
        return cachedAiQuestions;
      }

      console.warn('[AptiMaster AI] Fallback activated after AI generation failure.', {
        code: error?.code,
        message: error?.message
      });
      setActiveQuestionSource('mock', 'A fresh practice set is ready.');
      return fetchMockQuestions(setup);
    }

    throw error;
  }
}

export async function evaluateQuiz(questions, answersByQuestionId) {
  // Build complete score details in one reusable module.
  const scoreDetails = buildQuizResult(questions, answersByQuestionId);

  return submitAnswers({
    score: scoreDetails.totalScore,
    total: scoreDetails.totalQuestions,
    correctAnswers: scoreDetails.correctAnswers,
    wrongAnswers: scoreDetails.wrongAnswers,
    percentage: scoreDetails.percentage,
    performanceStatus: scoreDetails.performanceStatus,
    answerReview: scoreDetails.answerReview,
    answers: answersByQuestionId
  });
}
