/*
  Purpose: OpenRouter API client for generating aptitude quiz questions.

  API workflow overview:
  1. Build a prompt using category, difficulty, and question count.
  2. Send request to OpenRouter chat completions endpoint using fetch.
  3. Parse model output as JSON.
  4. Normalize response into quiz-question objects used by the app.

  Keeping this in a dedicated module separates network/API logic from UI logic.
*/

import { getAppConfig } from '../core/runtimeConfig.js';
import { isValidCategory, isValidTopicForCategory } from '../services/topicService.js';
import { loadApiKey } from '../services/apiKeyService.js';
import { buildQuizPrompt } from './quizPrompt.js';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function logOpenRouter(message, details = null) {
  if (!getAppConfig().DEBUG_OPENROUTER) return;

  if (details) {
    console.info(`[AptiMaster AI] ${message}`, details);
    return;
  }

  console.info(`[AptiMaster AI] ${message}`);
}

function maskApiKey(apiKey) {
  const normalized = String(apiKey || '').trim();
  if (!normalized) return 'missing';
  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

function createOpenRouterError(message, code, cause) {
  const error = new Error(message);
  error.code = code;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function buildQuestionResponseSchema(questionCount) {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'aptimaster_quiz_questions',
      strict: true,
      schema: {
        type: 'array',
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answer'],
          properties: {
            question: {
              type: 'string',
              minLength: 1
            },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'string',
                minLength: 1
              }
            },
            answer: {
              type: 'string',
              minLength: 1
            }
          }
        }
      }
    }
  };
}

export function getOpenRouterApiKey() {
  const appConfig = getAppConfig();

  // Runtime config is the primary key source for production-style personal deployments.
  const runtimeApiKey = String(appConfig.OPENROUTER_API_KEY || '').trim();
  if (runtimeApiKey) {
    return runtimeApiKey;
  }

  // localStorage fallback keeps the app usable without rebuilding static files.
  return loadApiKey();
}

function getOpenRouterApiKeyDetails() {
  const runtimeKey = String(getAppConfig().OPENROUTER_API_KEY || '').trim();
  if (runtimeKey) {
    return {
      key: runtimeKey,
      source: 'runtimeConfig',
      detected: true,
      masked: maskApiKey(runtimeKey)
    };
  }

  const localStorageKey = loadApiKey();
  return {
    key: localStorageKey,
    source: localStorageKey ? 'localStorage' : 'none',
    detected: Boolean(localStorageKey),
    masked: maskApiKey(localStorageKey)
  };
}

function extractContentFromResponse(apiResponse) {
  const content = apiResponse?.choices?.[0]?.message?.content;
  if (!content) {
    throw createOpenRouterError(
      'OpenRouter response did not contain question content.',
      'OPENROUTER_EMPTY_RESPONSE'
    );
  }
  return content;
}

function parseJsonContent(content) {
  const raw = String(content || '').trim();
  const withoutFences = raw
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  const normalized = withoutFences.replace(/\r\n/g, '\n').trim();
  const arrayStart = normalized.indexOf('[');
  const arrayEnd = normalized.lastIndexOf(']');
  const objectStart = normalized.indexOf('{');
  const objectEnd = normalized.lastIndexOf('}');
  const candidate =
    arrayStart !== -1 && arrayEnd > arrayStart
      ? normalized.slice(arrayStart, arrayEnd + 1)
      : objectStart !== -1 && objectEnd > objectStart
        ? normalized.slice(objectStart, objectEnd + 1)
        : normalized;

  logOpenRouter('Cleaned model response.', {
    cleanedPreview: candidate.slice(0, 1200),
    cleanedLength: candidate.length
  });

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.warn('[AptiMaster AI] Parse failure.', {
      code: 'OPENROUTER_INVALID_JSON',
      preview: raw.slice(0, 240)
    });
    throw createOpenRouterError('OpenRouter returned invalid JSON format.', 'OPENROUTER_INVALID_JSON', error);
  }
}

function normalizeText(value) {
  if (value && typeof value === 'object') {
    return String(value.text || value.label || value.value || '').replace(/\s+/g, ' ').trim();
  }

  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeForComparison(value) {
  return normalizeText(value).toLowerCase();
}

function resolveAnswerMatch(answer, options) {
  const normalizedAnswer = normalizeForComparison(answer);
  const directMatch = options.find(
    (option) => normalizeForComparison(option) === normalizedAnswer
  );

  if (directMatch) return directMatch;

  const letterMatch = normalizedAnswer.match(/^(?:option\s*)?([a-d])[\).:-]?$/i);
  if (letterMatch) {
    return options[letterMatch[1].toLowerCase().charCodeAt(0) - 97] || null;
  }

  const numberMatch = normalizedAnswer.match(/^([1-4])[\).:-]?$/);
  if (numberMatch) {
    return options[Number(numberMatch[1]) - 1] || null;
  }

  return null;
}

function validateQuestionSchema(question, index) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw createOpenRouterError(
      `Question ${index + 1} is not a valid object.`,
      'OPENROUTER_INVALID_QUESTION_SCHEMA'
    );
  }

  const questionText = normalizeText(question.question);
  if (!questionText) {
    throw createOpenRouterError(
      `Question ${index + 1} is missing a question field.`,
      'OPENROUTER_INVALID_QUESTION_SCHEMA'
    );
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    throw createOpenRouterError(
      `Question ${index + 1} must contain exactly 4 options.`,
      'OPENROUTER_INVALID_QUESTION_SCHEMA'
    );
  }

  const normalizedOptions = question.options.map((option) => normalizeText(option));
  const uniqueOptions = new Set(normalizedOptions.map((option) => normalizeForComparison(option)));

  if (uniqueOptions.size !== 4 || normalizedOptions.some((option) => !option)) {
    throw createOpenRouterError(
      `Question ${index + 1} contains duplicate or empty options.`,
      'OPENROUTER_INVALID_QUESTION_SCHEMA'
    );
  }

  const answer = normalizeText(question.answer);
  if (!answer) {
    throw createOpenRouterError(
      `Question ${index + 1} is missing an answer.`,
      'OPENROUTER_INVALID_QUESTION_SCHEMA'
    );
  }

  const matchedAnswer = resolveAnswerMatch(answer, normalizedOptions);

  if (!matchedAnswer) {
    throw createOpenRouterError(
      `Question ${index + 1} has an answer that is not in the options list.`,
      'OPENROUTER_INVALID_QUESTION_SCHEMA'
    );
  }

  return {
    question: questionText,
    options: normalizedOptions,
    answer: matchedAnswer,
    explanation: normalizeText(question.explanation)
  };
}

function normalizeQuestion(question, index, setup) {
  const validatedQuestion = validateQuestionSchema(question, index);

  return {
    id: index + 1,
    category: setup.category || 'mixed',
    topic: setup.topic || '',
    difficulty: setup.difficulty || 'medium',
    question: validatedQuestion.question,
    options: validatedQuestion.options,
    answer: validatedQuestion.answer,
    explanation: validatedQuestion.explanation
  };
}

function isRetryableOpenRouterError(error) {
  return Boolean(
    error &&
      [
        'OPENROUTER_INVALID_JSON',
        'OPENROUTER_EMPTY_RESPONSE',
        'OPENROUTER_INVALID_QUESTION_SCHEMA',
        'OPENROUTER_TIMEOUT',
        'OPENROUTER_NETWORK_ERROR',
        'OPENROUTER_HTTP_ERROR',
        'OPENROUTER_RATE_LIMIT',
        'OPENROUTER_EMPTY_QUESTIONS'
      ].includes(error.code)
  );
}

async function fetchOpenRouterResponse(prompt, apiKey, attempt) {
  const appConfig = getAppConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), appConfig.API_TIMEOUT);
  const requestedQuestionCount = Number(prompt.match(/Return exactly (\d+)/)?.[1] || 10);
  const maxTokens = Math.min(appConfig.MAX_TOKENS, Math.max(1200, requestedQuestionCount * 180));
  const requestPayload = {
    model: appConfig.DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a JSON-only aptitude quiz generator. Reply with one valid JSON array only. The first character must be [ and the last character must be ]. No markdown, no prose, no reasoning, no code fences.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: appConfig.DEFAULT_TEMPERATURE,
    max_tokens: maxTokens,
    response_format: buildQuestionResponseSchema(requestedQuestionCount)
  };

  logOpenRouter(`Request start (${attempt + 1}/${appConfig.RETRY_LIMIT + 1}).`, {
    model: appConfig.DEFAULT_MODEL,
    temperature: appConfig.DEFAULT_TEMPERATURE,
    maxTokens,
    payload: requestPayload
  });

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorCode = response.status === 429 ? 'OPENROUTER_RATE_LIMIT' : 'OPENROUTER_HTTP_ERROR';
      throw createOpenRouterError(
        `OpenRouter request failed (${response.status}): ${errorText}`,
        errorCode
      );
    }

    const apiResponse = await response.json();
    logOpenRouter('Raw OpenRouter response.', apiResponse);
    const content = extractContentFromResponse(apiResponse);
    logOpenRouter('Raw model content.', {
      contentPreview: String(content).slice(0, 2000),
      contentLength: String(content).length
    });
    const parsed = parseJsonContent(content);

    const questions = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;
    if (!questions || questions.length === 0) {
      throw createOpenRouterError(
        'OpenRouter did not return any questions.',
        'OPENROUTER_EMPTY_QUESTIONS'
      );
    }

    logOpenRouter('Request success.', {
      receivedQuestions: questions.length,
      model: apiResponse?.model || appConfig.DEFAULT_MODEL
    });

    return questions;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createOpenRouterError(
        `OpenRouter request timed out after ${appConfig.API_TIMEOUT}ms.`,
        'OPENROUTER_TIMEOUT',
        error
      );
    }

    if (error?.code) {
      throw error;
    }

    throw createOpenRouterError(
      `OpenRouter request failed: ${error?.message || 'Unknown error'}`,
      'OPENROUTER_NETWORK_ERROR',
      error
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateQuestionsFromOpenRouter(setup) {
  const apiKeyDetails = getOpenRouterApiKeyDetails();
  const apiKey = apiKeyDetails.key;

  logOpenRouter('API key detection.', {
    detected: apiKeyDetails.detected,
    source: apiKeyDetails.source,
    masked: apiKeyDetails.masked
  });

  if (!apiKey) {
    const error = new Error(
      'OpenRouter API key is missing. Configure OPENROUTER_API_KEY in runtimeConfig.js or save it in API settings.'
    );
    error.code = 'MISSING_OPENROUTER_API_KEY';
    throw error;
  }

  const category = setup?.category || 'mixed';
  const topic = setup?.topic || '';
  const appConfig = getAppConfig();

  if (!isValidCategory(category)) {
    throw new Error(`Invalid category selected: ${category}`);
  }

  if (topic && !isValidTopicForCategory(category, topic) && category !== 'mixed') {
    throw new Error(`Invalid topic "${topic}" for category "${category}".`);
  }

  const prompt = buildQuizPrompt(setup, appConfig);
  let lastError = null;
  logOpenRouter('Selected model.', { model: appConfig.DEFAULT_MODEL, setup });

  for (let attempt = 0; attempt <= appConfig.RETRY_LIMIT; attempt += 1) {
    try {
      const questions = await fetchOpenRouterResponse(prompt, apiKey, attempt);
      const normalized = [];

      questions.forEach((question, index) => {
        try {
          normalized.push(normalizeQuestion(question, index, setup));
        } catch (error) {
          console.warn('[AptiMaster AI] Schema failure.', {
            code: error?.code || 'OPENROUTER_INVALID_QUESTION_SCHEMA',
            questionNumber: index + 1,
            message: error?.message
          });
        }
      });

      if (normalized.length === 0) {
        console.warn('[AptiMaster AI] Schema validation rejected every generated question.', {
          receivedQuestions: questions.length,
          sampleQuestion: questions[0]
        });
        throw createOpenRouterError(
          'OpenRouter returned questions, but none matched the required quiz schema.',
          'OPENROUTER_INVALID_QUESTION_SCHEMA'
        );
      }

      if (normalized.length < questions.length) {
        console.warn('[AptiMaster AI] Some generated questions were skipped after schema validation.', {
          validQuestions: normalized.length,
          receivedQuestions: questions.length
        });
      }

      return normalized.slice(0, Number(setup?.questionCount) || normalized.length);
    } catch (error) {
      lastError = error;

      if (!isRetryableOpenRouterError(error) || attempt === appConfig.RETRY_LIMIT) {
        console.warn('[AptiMaster AI] Retry loop stopping.', {
          code: error?.code,
          message: error?.message,
          attempt: attempt + 1,
          retryLimit: appConfig.RETRY_LIMIT
        });
        break;
      }

      console.warn('[AptiMaster AI] Retrying question generation.', error?.code || error?.message);
      await wait(appConfig.RETRY_DELAY_MS * (attempt + 1));
    }
  }

  const retryLimitError = createOpenRouterError(
    `OpenRouter failed after ${appConfig.RETRY_LIMIT + 1} attempts.`,
    'OPENROUTER_RETRY_LIMIT_EXCEEDED',
    lastError
  );

  console.warn('[AptiMaster AI] OpenRouter generation failed before fallback.', {
    code: retryLimitError.code,
    message: retryLimitError.message,
    lastErrorCode: lastError?.code,
    lastErrorMessage: lastError?.message,
    lastErrorCause: lastError?.cause?.message
  });

  throw retryLimitError;
}
