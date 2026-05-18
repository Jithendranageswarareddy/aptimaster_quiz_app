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
  const source = options.source || 'api';

  if (source === 'mock') {
    setActiveQuestionSource('mock');
    return fetchMockQuestions(setup);
  }

  try {
    const apiResult = await fetchQuestions(setup);
    const questions = Array.isArray(apiResult) ? apiResult : apiResult.questions;
    const responseSource = Array.isArray(apiResult) ? 'ai' : apiResult.source || 'ai';

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Quiz API returned no questions.');
    }

    if (responseSource === 'fallback') {
      setActiveQuestionSource('mock', apiResult.fallbackMessage || AI_FALLBACK_MESSAGE);
      return questions;
    }

    setActiveQuestionSource('ai');
    saveAiQuestionCache(setup, questions);
    return questions;
  } catch (error) {
    const cachedAiQuestions = readAiQuestionCache(setup);
    if (cachedAiQuestions.length > 0) {
      console.warn('[AptiMaster AI] Using cached AI questions after API failure.', {
        code: error?.code,
        cachedQuestions: cachedAiQuestions.length
      });
      setActiveQuestionSource('ai');
      return cachedAiQuestions;
    }

    console.warn('[AptiMaster AI] Fallback activated after API failure.', {
      code: error?.code,
      message: error?.message
    });
    setActiveQuestionSource('mock', AI_FALLBACK_MESSAGE);
    return fetchMockQuestions(setup);
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
