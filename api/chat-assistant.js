const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash:free';
const REQUEST_TIMEOUT_MS = 45000;
const RETRY_LIMIT = 2;
const RETRY_DELAY_MS = 1000;
const DEBUG_MODE = false;

function log(label, message, data = null) {
  if (!DEBUG_MODE) return;
  const timestamp = new Date().toISOString();
  const payload = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${label}] ${message}${payload}`);
}

function logError(label, message, error = null) {
  const timestamp = new Date().toISOString();
  const errorPayload = error ? ` | ${error.message || String(error)}` : '';
  console.error(`[${timestamp}] [${label}] ${message}${errorPayload}`);
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanModelContent(content) {
  const raw = normalizeText(content).replace(/^\uFEFF/, '');
  const withoutFences = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const objectStart = withoutFences.indexOf('{');
  const objectEnd = withoutFences.lastIndexOf('}');

  if (objectStart !== -1 && objectEnd > objectStart) {
    return withoutFences.slice(objectStart, objectEnd + 1);
  }

  return withoutFences;
}

function validateQuestion(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw new Error('Question context is invalid.');
  }

  const questionText = normalizeText(question.text);
  const explanation = normalizeText(question.explanation);
  const answer = normalizeText(question.answer);
  const options = Array.isArray(question.options) ? question.options.map((option) => normalizeText(option)) : [];

  if (!questionText || !explanation || !answer || options.length === 0) {
    throw new Error('Question context is incomplete.');
  }

  return {
    text: questionText,
    options,
    answer,
    explanation
  };
}

function validateHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: message.role,
      content: normalizeText(message.content)
    }))
    .filter((message) => message.content)
    .slice(-8);
}

function buildResponseSchema() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'aptimaster_chat_assistant_response',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['reply', 'suggestedFollowUps'],
        properties: {
          reply: { type: 'string', minLength: 1 },
          suggestedFollowUps: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  };
}

function buildTutorPrompt(payload) {
  const { setup, question, questionMeta, latestMessage, history } = payload;

  return `You are AptiMaster Tutor, a beginner-friendly aptitude and placement mentor.

Goals:
- Explain the current question clearly.
- Explain why the correct answer is right and why other options are wrong when relevant.
- Solve step-by-step.
- Offer shortcuts and concept-based intuition.
- Support follow-up questions by using the chat history.
- Stay focused on aptitude learning only.

Style rules:
- Be concise, clear, and educational.
- Use simple language and short paragraphs.
- Avoid generic chatbot behavior.
- Do not invent facts that are not supported by the question context.
- If the user asks something unrelated, gently redirect to the active aptitude question.
- Mention the correct answer only when it helps learning.
- Use bullet points when they improve readability.
- If relevant, end with a short "Final answer:" line.
- Explain why other options are wrong when asked.
- Prefer a tutor tone over a chatbot tone.

Current question context:
${JSON.stringify({ setup, question, questionMeta }, null, 2)}

Conversation history:
${JSON.stringify(history, null, 2)}

Latest user message:
${latestMessage}

Return valid JSON only with this shape:
{
  "reply": "string",
  "suggestedFollowUps": ["string", "string", "string", "string"]
}`;
}

function buildFallbackReply(payload) {
  const question = payload.question || {};
  const answer = normalizeText(question.answer) || 'the correct option';
  const explanation = normalizeText(question.explanation) || 'Use the question details to reason through the answer.';
  const topic = normalizeText(payload.questionMeta?.topicLabel || payload.setup?.topic || 'this topic');
  const latestMessage = normalizeText(payload.latestMessage);

  return {
    source: 'fallback',
    reply: [
      `Let’s focus on ${topic}.`,
      `Final answer: ${answer}.`,
      explanation,
      latestMessage ? 'Try asking for a shortcut, a simpler explanation, or why the other options are incorrect.' : ''
    ]
      .filter(Boolean)
      .join('\n\n'),
    suggestedFollowUps: [
      'Need a shortcut?',
      'Want step-by-step solving?',
      'Ask why other options are incorrect',
      'Show a common mistake'
    ]
  };
}

function buildPromptPayload(body) {
  const setup = {
    category: normalizeText(body?.setup?.category) || 'mixed',
    topic: normalizeText(body?.setup?.topic) || 'Mixed Practice',
    difficulty: normalizeText(body?.setup?.difficulty) || 'medium'
  };

  const question = validateQuestion(body?.question);
  const history = validateHistory(body?.history);
  const latestMessage = normalizeText(body?.latestMessage);

  if (!latestMessage) {
    throw new Error('Latest user message is required.');
  }

  return {
    setup,
    question,
    questionMeta: {
      questionIndex: Number(body?.questionMeta?.questionIndex) || 0,
      totalQuestions: Number(body?.questionMeta?.totalQuestions) || 0,
      topicLabel: normalizeText(body?.questionMeta?.topicLabel) || setup.topic
    },
    latestMessage,
    history
  };
}

async function callOpenRouter(payload, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const body = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a strict JSON-only aptitude tutor for AptiMaster. Stay focused on aptitude learning, use a warm teaching tone, explain step-by-step when needed, and keep answers concise but useful. Never answer unrelated questions.'
      },
      {
        role: 'user',
        content: buildTutorPrompt(payload)
      }
    ],
    temperature: 0.2,
    max_tokens: 1200,
    response_format: buildResponseSchema()
  };

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://aptimaster.vercel.app',
        'X-Title': 'AptiMaster'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('CHAT', `OpenRouter HTTP ${response.status}`, new Error(errorText));
      const error = new Error(`OpenRouter HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      error.code = response.status === 429 ? 'CHAT_ASSISTANT_RATE_LIMIT' : 'CHAT_ASSISTANT_HTTP_ERROR';
      error.statusCode = response.status;
      throw error;
    }

    const payloadData = await response.json();
    const content = payloadData?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenRouter response did not include assistant content.');
    }

    const cleanedContent = cleanModelContent(content);
    const parsed = JSON.parse(cleanedContent);

    if (!parsed || typeof parsed.reply !== 'string' || !normalizeText(parsed.reply)) {
      throw new Error('Assistant response missing reply.');
    }

    if (!Array.isArray(parsed.suggestedFollowUps)) {
      throw new Error('Assistant response missing follow-up suggestions.');
    }

    return {
      source: 'ai',
      reply: normalizeText(parsed.reply),
      suggestedFollowUps: parsed.suggestedFollowUps.map((item) => normalizeText(item)).filter(Boolean).slice(0, 4)
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = async function chatAssistant(req, res) {
  const requestId = Math.random().toString(36).slice(2, 10);

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid JSON request body.', code: 'INVALID_REQUEST_BODY' });
    return;
  }

  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();

  let payload;
  try {
    payload = buildPromptPayload(body);
  } catch (error) {
    logError('CHAT', `[${requestId}] Invalid payload`, error);
    sendJson(res, 400, { error: error.message, code: 'CHAT_ASSISTANT_INVALID_REQUEST' });
    return;
  }

  if (!apiKey) {
    const fallback = buildFallbackReply(payload);
    sendJson(res, 200, fallback);
    return;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    try {
      const response = await callOpenRouter(payload, apiKey);
      sendJson(res, 200, response);
      return;
    } catch (error) {
      lastError = error;
      logError('CHAT', `[${requestId}] Attempt ${attempt + 1} failed`, error);

      if (attempt < RETRY_LIMIT) {
        const delayMs = RETRY_DELAY_MS * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  const fallback = buildFallbackReply(payload);
  sendJson(res, 200, {
    ...fallback,
    source: 'fallback',
    lastError: lastError ? lastError.message : 'Chat assistant request failed.'
  });
};
