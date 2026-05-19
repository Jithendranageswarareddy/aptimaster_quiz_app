/*
  Purpose: Low-level quiz data methods.
*/

import { MOCK_QUESTIONS } from '../data/mockQuestions.js';
import { normalizeCategoryTopicSelection } from '../services/topicService.js';
import { getAppConfig } from '../core/runtimeConfig.js';

const PRACTICE_TEMPLATES = [
  {
    question: (topicLabel, index) =>
      `A ${topicLabel} problem uses values ${12 + index} and ${8 + index}. What is their sum?`,
    options: (index) => [`${18 + index}`, `${20 + index * 2}`, `${22 + index}`, `${24 + index}`],
    answer: (index) => `${20 + index * 2}`,
    explanation: (topicLabel, index) =>
      `Add the two values directly: ${12 + index} + ${8 + index} = ${20 + index * 2}.`
  },
  {
    question: (topicLabel, index) =>
      `In a ${topicLabel} set, a value increases from ${40 + index * 2} to ${50 + index * 2}. What is the increase?`,
    options: () => ['5', '8', '10', '12'],
    answer: () => '10',
    explanation: () => 'Subtract the original value from the new value: 50 - 40 = 10.'
  },
  {
    question: (topicLabel, index) =>
      `Which option best completes this ${topicLabel} pattern: ${index + 2}, ${index + 4}, ${index + 6}, ?`,
    options: (index) => [`${index + 7}`, `${index + 8}`, `${index + 9}`, `${index + 10}`],
    answer: (index) => `${index + 8}`,
    explanation: () => 'The pattern increases by 2 each step.'
  },
  {
    question: (topicLabel) =>
      `For a ${topicLabel} question, which strategy is most reliable before choosing an answer?`,
    options: () => [
      'Identify the key relationship',
      'Pick the longest option',
      'Ignore the given data',
      'Choose randomly'
    ],
    answer: () => 'Identify the key relationship',
    explanation: (topicLabel) =>
      `A ${topicLabel} question is easier when you first identify what the values or words are trying to show.`
  },
  {
    question: (topicLabel, index) =>
      `A ${topicLabel} question asks for the difference between ${60 + index} and ${45 + index}. What is the difference?`,
    options: (index) => [`${10 + index}`, `${12 + index}`, `${15 + index}`, `${18 + index}`],
    answer: (index) => `${15 + index}`,
    explanation: (topicLabel, index) =>
      `Subtract the smaller value from the larger one: ${60 + index} - ${45 + index} = ${15 + index}.`
  },
  {
    question: (topicLabel, index) =>
      `A ${topicLabel} item costs ${20 + index * 3}. What is 10% of that value?`,
    options: (index) => [`${1 + index}`, `${2 + index}`, `${3 + index}`, `${4 + index}`],
    answer: (index) => `${2 + index}`,
    explanation: (topicLabel, index) =>
      `Ten percent means divide by 10: ${20 + index * 3} / 10 is closest to ${2 + index}.`
  },
  {
    question: (topicLabel, index) =>
      `Two ${topicLabel} workers complete a task in ${6 + index} hours and ${9 + index} hours. Which value is the faster completion time?`,
    options: (index) => [`${5 + index}`, `${6 + index}`, `${7 + index}`, `${8 + index}`],
    answer: (index) => `${6 + index}`,
    explanation: (topicLabel, index) =>
      `A smaller time means a faster completion, so ${6 + index} hours is the better choice.`
  },
  {
    question: (topicLabel, index) =>
      `A ${topicLabel} series goes 3, 6, 12, 24, ?. What comes next?`,
    options: (index) => [`${40 + index}`, `${42 + index}`, `${44 + index}`, `${48 + index}`],
    answer: (index) => `${48 + index}`,
    explanation: () => 'The sequence doubles each time: 3, 6, 12, 24, 48.'
  }
];

function createTopicPracticeQuestion(category, topic, difficulty, index) {
  const topicLabel = topic?.label || 'Mixed Practice';
  const template = PRACTICE_TEMPLATES[index % PRACTICE_TEMPLATES.length];

  return {
    id: index + 1,
    category,
    topic: topic?.value || '',
    difficulty,
    question: template.question(topicLabel, index),
    options: template.options(index),
    answer: template.answer(index),
    explanation: template.explanation(topicLabel, index)
  };
}

function createSeededRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  return function nextRandom() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function shuffleQuestions(items, seed) {
  const random = createSeededRandom(seed);
  const output = [...items];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

export async function fetchMockQuestions(setup = {}) {
  const { category = 'mixed', topic = '', difficulty = 'medium', questionCount = 10 } = setup;

  const normalizedSelection = normalizeCategoryTopicSelection(category, topic);
  const activeCategory = normalizedSelection.category;
  const activeTopic = normalizedSelection.topic?.value || topic;
  const activeTopicMeta = normalizedSelection.topic;

  // Step 1: filter by category unless "mixed" is selected.
  const categoryFiltered =
    activeCategory === 'mixed'
      ? MOCK_QUESTIONS
      : MOCK_QUESTIONS.filter((question) => question.category === activeCategory);

  // Step 2: filter by selected topic on the category result.
  const topicFiltered = activeTopic
    ? categoryFiltered.filter((question) => question.topic === activeTopic)
    : categoryFiltered;

  // Step 3: filter by difficulty on the topic result.
  const difficultyFiltered = topicFiltered.filter(
    (question) => question.difficulty === difficulty
  );

  // Step 4: fallback to topic-only, then category-only questions if exact difficulty has too few results.
  const selectedPool =
    difficultyFiltered.length > 0
      ? difficultyFiltered
      : topicFiltered.length > 0
        ? topicFiltered
        : categoryFiltered;

  // If the local pool is too small, synthesize topic-aware practice questions.
  const requestedCount = Number(questionCount);
  const seededQuestions = shuffleQuestions(selectedPool, Date.now() + requestedCount).slice(0, requestedCount);

  while (seededQuestions.length < requestedCount) {
    seededQuestions.push(
      createTopicPracticeQuestion(activeCategory, activeTopicMeta, difficulty, seededQuestions.length)
    );
  }

  return Promise.resolve(seededQuestions.map((question, index) => ({ ...question, id: index + 1 })));
}

export async function fetchQuestions(setup = {}) {
  const appConfig = getAppConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), appConfig.API_TIMEOUT);

  try {
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: setup.category || 'mixed',
        topic: setup.topic || '',
        difficulty: setup.difficulty || 'medium',
        questionCount: Math.min(Number(setup.questionCount) || 10, appConfig.MAX_QUESTIONS)
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(payload?.error || 'Question generation failed.');
      error.code = payload?.code || 'QUIZ_API_ERROR';
      throw error;
    }

    if (!payload || !Array.isArray(payload.questions)) {
      const error = new Error('Quiz API returned an invalid response.');
      error.code = 'QUIZ_API_INVALID_RESPONSE';
      throw error;
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Quiz API request timed out.');
      timeoutError.code = 'QUIZ_API_TIMEOUT';
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function submitAnswers(payload) {
  const suggestion =
    payload.percentage >= 75
      ? 'Excellent work. Move to hard mixed sets and timed mock tests.'
      : payload.percentage >= 40
        ? 'Solid base. Keep practicing medium-level mixed quizzes daily.'
        : 'Good start. Focus on fundamentals and solve easy quizzes consistently.';

  return Promise.resolve({
    score: payload.score,
    total: payload.total,
    correctAnswers: payload.correctAnswers,
    wrongAnswers: payload.wrongAnswers,
    percentage: payload.percentage,
    performanceStatus: payload.performanceStatus,
    answerReview: payload.answerReview,
    aiSuggestion: suggestion
  });
}
