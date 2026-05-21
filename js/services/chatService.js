/*
  Purpose: Chat assistant service for AptiMaster.

  Responsibilities:
  - Build per-question session keys for chat memory
  - Persist a short conversation history in localStorage
  - Send question context and chat history to the serverless AI route
  - Validate responses and provide a stable fallback path
*/

import { safeReadStorage, safeRemoveStorage, safeWriteStorage, getAppConfig } from '../core/runtimeConfig.js';

const CHAT_HISTORY_LIMIT = 12;
const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_RETRY_LIMIT = 2;
const CHAT_STORAGE_PREFIX = 'aptimaster_chat_session';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'question';
}

function createQuestionSignature(questionContext) {
  if (!questionContext) return 'unknown';

  const signatureParts = [
    questionContext.category,
    questionContext.topic,
    questionContext.difficulty,
    questionContext.question?.id,
    questionContext.question?.question
  ];

  return signatureParts.map((part) => slugify(part)).join('_');
}

export function buildChatSessionKey(questionContext) {
  return `${CHAT_STORAGE_PREFIX}_${createQuestionSignature(questionContext)}`;
}

export function getQuickPrompts(questionContext) {
  const topicLabel = normalizeText(questionContext?.topicLabel || questionContext?.topic || 'this question');

  return [
    `Explain ${topicLabel} step-by-step`,
    'Why is the correct option right?',
    'Give me a shortcut method',
    'Explain it in simpler words'
  ];
}

export function loadChatThread(questionContext) {
  const key = buildChatSessionKey(questionContext);
  const raw = safeReadStorage(key, '');
  if (!raw) {
    return {
      key,
      messages: []
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      key,
      messages: Array.isArray(parsed.messages) ? parsed.messages : []
    };
  } catch (error) {
    console.warn('Saved chat history could not be parsed.', error);
    return {
      key,
      messages: []
    };
  }
}

export function saveChatThread(questionContext, messages) {
  const key = buildChatSessionKey(questionContext);
  const sanitizedMessages = Array.isArray(messages)
    ? messages
        .filter((message) => message && ['user', 'assistant'].includes(message.role))
        .map((message) => ({
          role: message.role,
          content: normalizeText(message.content)
        }))
        .filter((message) => message.content)
        .slice(-CHAT_HISTORY_LIMIT)
    : [];

  safeWriteStorage(
    key,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      messages: sanitizedMessages
    })
  );
}

export function clearChatThread(questionContext) {
  safeRemoveStorage(buildChatSessionKey(questionContext));
}

export function buildFallbackChatReply(questionContext, latestMessage) {
  const question = questionContext?.question || {};
  const answer = normalizeText(question.answer) || 'the correct option';
  const explanation = normalizeText(question.explanation) || 'Use the question details to reason through the answer.';
  const topicLabel = normalizeText(questionContext?.topicLabel || questionContext?.topic || 'this topic');
  const prompt = normalizeText(latestMessage);

  const reply = [
    `Let’s work through ${topicLabel}.`,
    `The correct answer is ${answer}.`,
    explanation,
    prompt ? `If you want, ask me a more specific follow-up like "Why is ${answer} correct?" or "Show me a shortcut."` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return {
    source: 'fallback',
    reply,
    suggestedFollowUps: [
      'Explain it step-by-step',
      'Show a shortcut method',
      'Why is this option wrong?'
    ]
  };
}

export function buildChatRequestPayload(questionContext, latestMessage, history = []) {
  const question = questionContext?.question || {};
  const normalizedHistory = Array.isArray(history)
    ? history
        .filter((message) => message && ['user', 'assistant'].includes(message.role))
        .map((message) => ({
          role: message.role,
          content: normalizeText(message.content)
        }))
        .filter((message) => message.content)
        .slice(-CHAT_HISTORY_LIMIT)
    : [];

  return {
    setup: {
      category: questionContext?.category || 'mixed',
      topic: questionContext?.topic || '',
      difficulty: questionContext?.difficulty || 'medium'
    },
    question: {
      id: question.id,
      text: normalizeText(question.question),
      options: Array.isArray(question.options) ? question.options.map((option) => normalizeText(option)) : [],
      answer: normalizeText(question.answer),
      explanation: normalizeText(question.explanation)
    },
    questionMeta: {
      questionIndex: Number(questionContext?.questionIndex) || 0,
      totalQuestions: Number(questionContext?.totalQuestions) || 0,
      topicLabel: normalizeText(questionContext?.topicLabel || questionContext?.topic || '')
    },
    latestMessage: normalizeText(latestMessage),
    history: normalizedHistory
  };
}

function buildTimeoutError() {
  const error = new Error('Chat assistant request timed out.');
  error.code = 'CHAT_ASSISTANT_TIMEOUT';
  return error;
}

function buildResponseValidationError() {
  const error = new Error('Chat assistant returned an invalid response.');
  error.code = 'CHAT_ASSISTANT_INVALID_RESPONSE';
  return error;
}

export async function sendChatAssistantMessage(questionContext, latestMessage, history = []) {
  const appConfig = getAppConfig();
  const timeoutMs = Number(appConfig.API_TIMEOUT || DEFAULT_TIMEOUT_MS);
  const retryLimit = Math.max(0, Number(appConfig.RETRY_LIMIT || DEFAULT_RETRY_LIMIT));
  const payload = buildChatRequestPayload(questionContext, latestMessage, history);

  let lastError = null;

  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(responseData?.error || 'Chat assistant request failed.');
        error.code = responseData?.code || 'CHAT_ASSISTANT_REQUEST_ERROR';
        throw error;
      }

      if (!responseData || typeof responseData.reply !== 'string' || !normalizeText(responseData.reply)) {
        throw buildResponseValidationError();
      }

      return {
        source: responseData.source === 'ai' ? 'ai' : 'fallback',
        reply: normalizeText(responseData.reply),
        suggestedFollowUps: Array.isArray(responseData.suggestedFollowUps)
          ? responseData.suggestedFollowUps.map((item) => normalizeText(item)).filter(Boolean).slice(0, 3)
          : []
      };
    } catch (error) {
      lastError = error;

      if (error?.name === 'AbortError') {
        lastError = buildTimeoutError();
      }

      if (attempt < retryLimit) {
        const delayMs = 800 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error('Chat assistant request failed.');
}
