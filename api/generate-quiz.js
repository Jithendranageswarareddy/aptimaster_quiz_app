const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash:free';
const REQUEST_TIMEOUT_MS = 45000;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1000;
const MAX_QUESTIONS = 20;
const FALLBACK_MESSAGE = 'A fresh practice set is ready.';
const DEBUG_MODE = true;

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '***';
  return `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`;
}

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

function normalizeForComparison(value) {
  return normalizeText(value).toLowerCase();
}

function cleanModelContent(content) {
  const raw = normalizeText(content).replace(/^\uFEFF/, '');
  const withoutFences = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const arrayStart = withoutFences.indexOf('[');
  const arrayEnd = withoutFences.lastIndexOf(']');
  const objectStart = withoutFences.indexOf('{');
  const objectEnd = withoutFences.lastIndexOf('}');

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return withoutFences.slice(arrayStart, arrayEnd + 1);
  }

  if (objectStart !== -1 && objectEnd > objectStart) {
    return withoutFences.slice(objectStart, objectEnd + 1);
  }

  return withoutFences;
}

function resolveAnswerMatch(answer, options) {
  const normalizedAnswer = normalizeForComparison(answer);
  const directMatch = options.find((option) => normalizeForComparison(option) === normalizedAnswer);
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

function validateQuestion(question, index) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw new Error(`Question ${index + 1} is not a valid object.`);
  }

  const questionText = normalizeText(question.question);
  const explanation = normalizeText(question.explanation);

  if (!questionText) {
    throw new Error(`Question ${index + 1} is missing a question.`);
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    throw new Error(`Question ${index + 1} must contain exactly 4 options.`);
  }

  const options = question.options.map((option) => normalizeText(option));
  const uniqueOptions = new Set(options.map((option) => normalizeForComparison(option)));
  if (uniqueOptions.size !== 4 || options.some((option) => !option)) {
    throw new Error(`Question ${index + 1} contains duplicate or empty options.`);
  }

  if (!explanation) {
    throw new Error(`Question ${index + 1} is missing an explanation.`);
  }

  const answer = normalizeText(question.answer);
  const resolvedAnswer = resolveAnswerMatch(answer, options);
  if (!resolvedAnswer) {
    throw new Error(`Question ${index + 1} has an answer that does not match the options.`);
  }

  return {
    question: questionText,
    options,
    answer: resolvedAnswer,
    explanation
  };
}

function validateQuestionSet(questions, expectedCount) {
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    throw new Error('OpenRouter did not return the expected number of questions.');
  }

  return questions.map((question, index) => validateQuestion(question, index));
}

function buildPrompt(setup) {
  const category = normalizeText(setup.category) || 'mixed';
  const topic = normalizeText(setup.topic) || 'Mixed Practice';
  const difficulty = normalizeText(setup.difficulty) || 'medium';
  const questionCount = Math.max(1, Math.min(Number(setup.questionCount) || 10, MAX_QUESTIONS));

  return `Return exactly ${questionCount} realistic aptitude multiple-choice questions as strict JSON only.

Rules:
- Return a JSON array only.
- No markdown.
- No code fences.
- No reasoning text.
- No commentary before or after the JSON array.
- Each item must contain question, options, answer, and explanation.
- Each question must stay within the topic scope.
- Every question must have exactly four unique options.
- The answer must exactly match one option string.

Setup:
- Category: ${category}
- Topic: ${topic}
- Difficulty: ${difficulty}

Required JSON shape:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "answer": "string",
    "explanation": "string"
  }
]`;
}

function buildResponseSchema(questionCount) {
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
          required: ['question', 'options', 'answer', 'explanation'],
          properties: {
            question: { type: 'string', minLength: 1 },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string', minLength: 1 }
            },
            answer: { type: 'string', minLength: 1 },
            explanation: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  };
}

function buildFallbackQuestion(topicLabel, difficulty, index) {
  const templates = [
    () => {
      const first = 12 + index;
      const second = 8 + index;
      const correct = first + second;
      return {
        question: `A ${topicLabel} problem uses values ${first} and ${second}. What is their sum?`,
        options: [correct - 2, correct - 1, correct, correct + 2].map(String),
        answer: String(correct),
        explanation: `Add the numbers directly: ${first} + ${second} = ${correct}.`
      };
    },
    () => {
      const start = 40 + index * 2;
      const end = start + 10;
      return {
        question: `In a ${topicLabel} set, a value increases from ${start} to ${end}. What is the increase?`,
        options: ['6', '8', '10', '12'],
        answer: '10',
        explanation: `Subtract the original value from the new value: ${end} - ${start} = 10.`
      };
    },
    () => {
      const seed = index + 2;
      return {
        question: `Which option best completes this ${topicLabel} pattern: ${seed}, ${seed + 2}, ${seed + 4}, ?`,
        options: [seed + 5, seed + 6, seed + 7, seed + 8].map(String),
        answer: String(seed + 6),
        explanation: 'The pattern increases by 2 at every step.'
      };
    },
    () => {
      const base = 18 + index;
      return {
        question: `A ${difficulty} ${topicLabel} question uses a total of ${base * 2} items split equally. How many items are in each group?`,
        options: [base - 2, base - 1, base, base + 1].map(String),
        answer: String(base),
        explanation: `Split the total in half: ${base * 2} ÷ 2 = ${base}.`
      };
    },
    () => {
      const first = 24 + index * 2;
      const second = 30 + index * 2;
      const average = (first + second) / 2;
      return {
        question: `What is the average of ${first} and ${second} in a ${topicLabel} question?`,
        options: [average - 2, average - 1, average, average + 2].map(String),
        answer: String(average),
        explanation: `Add the values and divide by 2: (${first} + ${second}) / 2 = ${average}.`
      };
    },
    () => {
      const ratio = 3 + (index % 3);
      return {
        question: `If a ${topicLabel} ratio is ${ratio}:${ratio + 1}, what is the first part?`,
        options: [ratio, ratio + 1, ratio + 2, ratio + 3].map(String),
        answer: String(ratio),
        explanation: `The ratio ${ratio}:${ratio + 1} means the first quantity uses ${ratio} equal parts.`
      };
    }
  ];

  return templates[index % templates.length]();
}

function buildFallbackQuestions(setup) {
  const category = normalizeText(setup.category) || 'mixed';
  const topicLabel = normalizeText(setup.topic) || 'Mixed Practice';
  const difficulty = normalizeText(setup.difficulty) || 'medium';
  const questionCount = Math.max(1, Math.min(Number(setup.questionCount) || 10, MAX_QUESTIONS));
  const randomSeed = Math.floor(Math.random() * 10000);

  const questions = [];
  for (let index = 0; index < questionCount; index += 1) {
    const seedValue = randomSeed + index;
    const templateIndex = seedValue % 8;
    questions.push({
      id: index + 1,
      category,
      topic: normalizeText(setup.topic),
      difficulty,
      ...buildFallbackQuestion(topicLabel, difficulty, seedValue)
    });
  }

  return questions;
}
}

async function callOpenRouter(setup, apiKey) {
  const questionCount = Math.max(1, Math.min(Number(setup.questionCount) || 10, MAX_QUESTIONS));
  
  log('OPENROUTER', 'Starting OpenRouter request', {
    model: OPENROUTER_MODEL,
    endpoint: OPENROUTER_ENDPOINT,
    apiKeyPresent: !!apiKey,
    apiKeyMasked: maskApiKey(apiKey),
    questionCount,
    timeout: REQUEST_TIMEOUT_MS
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  const body = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a JSON-only aptitude quiz generator. Return one valid JSON array only. The first character must be [ and the last character must be ]. No markdown, no prose, no reasoning, no code fences.'
      },
      {
        role: 'user',
        content: buildPrompt(setup)
      }
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: buildResponseSchema(questionCount)
  };

  try {
    log('OPENROUTER', 'Sending HTTP POST request to OpenRouter', {
      url: OPENROUTER_ENDPOINT,
      model: OPENROUTER_MODEL,
      maxTokens: body.max_tokens
    });

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${maskApiKey(apiKey)}`,
        'HTTP-Referer': 'https://aptimaster.vercel.app',
        'X-Title': 'AptiMaster'
      },
      body: JSON.stringify(body)
    });

    log('OPENROUTER', 'HTTP response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('OPENROUTER', `HTTP error (${response.status})`, new Error(errorText));
      const error = new Error(`OpenRouter HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      error.code = response.status === 429 ? 'OPENROUTER_RATE_LIMIT' : 'OPENROUTER_HTTP_ERROR';
      error.statusCode = response.status;
      throw error;
    }

    log('OPENROUTER', 'Parsing JSON response');
    const payload = await response.json();
    
    log('OPENROUTER', 'Raw payload received', {
      hasChoices: !!payload.choices,
      choicesLength: payload.choices?.length,
      hasMessage: !!payload.choices?.[0]?.message,
      hasContent: !!payload.choices?.[0]?.message?.content
    });

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      logError('OPENROUTER', 'No content in response', new Error('choices[0].message.content missing'));
      throw new Error('OpenRouter response did not contain question content.');
    }

    log('OPENROUTER', 'Content received', {
      contentLength: content.length,
      contentPreview: content.slice(0, 100)
    });

    const cleanedContent = cleanModelContent(content);
    log('OPENROUTER', 'Cleaned content', {
      cleanedLength: cleanedContent.length,
      cleanedPreview: cleanedContent.slice(0, 100)
    });

    const parsed = JSON.parse(cleanedContent);
    log('OPENROUTER', 'JSON parsed successfully', {
      isArray: Array.isArray(parsed),
      itemCount: Array.isArray(parsed) ? parsed.length : 'n/a'
    });

    const questions = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;

    if (!questions) {
      logError('OPENROUTER', 'Invalid question payload structure');
      throw new Error('OpenRouter returned an invalid question payload.');
    }

    log('OPENROUTER', 'Validating question set', { questionCount: questions.length, expectedCount: questionCount });
    const validated = validateQuestionSet(questions, questionCount);
    
    log('OPENROUTER', 'All questions validated successfully', { count: validated.length });

    return validated.map((question, index) => ({
      id: index + 1,
      category: normalizeText(setup.category) || 'mixed',
      topic: normalizeText(setup.topic),
      difficulty: normalizeText(setup.difficulty) || 'medium',
      ...question
    }));
  } catch (error) {
    logError('OPENROUTER', `Request failed: ${error.message}`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = async function generateQuiz(req, res) {
  const requestId = Math.random().toString(36).slice(2, 10);
  log('HANDLER', `[${requestId}] Incoming request`, {
    method: req.method,
    path: req.url
  });

  if (req.method !== 'POST') {
    logError('HANDLER', `[${requestId}] Invalid HTTP method: ${req.method}`);
    sendJson(res, 405, { error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    log('HANDLER', `[${requestId}] Request body parsed`, body);
  } catch (error) {
    logError('HANDLER', `[${requestId}] Failed to parse request body`, error);
    sendJson(res, 400, { error: 'Invalid JSON request body.', code: 'INVALID_REQUEST_BODY' });
    return;
  }

  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  const setup = {
    category: normalizeText(body.category) || 'mixed',
    topic: normalizeText(body.topic),
    difficulty: normalizeText(body.difficulty) || 'medium',
    questionCount: Math.max(1, Math.min(Number(body.questionCount) || 10, MAX_QUESTIONS))
  };

  log('HANDLER', `[${requestId}] Quiz setup`, setup);
  log('HANDLER', `[${requestId}] API key status`, {
    keyPresent: !!apiKey,
    keyMasked: maskApiKey(apiKey)
  });

  if (!apiKey) {
    logError('HANDLER', `[${requestId}] OPENROUTER_API_KEY environment variable not set or empty`);
    log('HANDLER', `[${requestId}] Triggering fallback due to missing API key`);
    sendJson(res, 200, {
      source: 'fallback',
      fallbackMessage: FALLBACK_MESSAGE,
      fallbackReason: 'API_KEY_NOT_CONFIGURED',
      questions: buildFallbackQuestions(setup)
    });
    return;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    try {
      log('HANDLER', `[${requestId}] Attempt ${attempt + 1}/${RETRY_LIMIT + 1}`);
      const questions = await callOpenRouter(setup, apiKey);
      log('HANDLER', `[${requestId}] SUCCESS: OpenRouter returned ${questions.length} questions`);
      sendJson(res, 200, {
        source: 'ai',
        questions
      });
      return;
    } catch (error) {
      lastError = error;
      logError('HANDLER', `[${requestId}] Attempt ${attempt + 1} failed`, error);
      
      if (attempt < RETRY_LIMIT) {
        const delayMs = RETRY_DELAY_MS * (attempt + 1);
        log('HANDLER', `[${requestId}] Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  logError('HANDLER', `[${requestId}] All ${RETRY_LIMIT + 1} attempts exhausted, triggering fallback`);
  log('HANDLER', `[${requestId}] Last error:`, lastError ? lastError.message : 'unknown');
  sendJson(res, 200, {
    source: 'fallback',
    fallbackMessage: FALLBACK_MESSAGE,
    fallbackReason: 'OPENROUTER_FAILED_ALL_RETRIES',
    lastError: lastError ? lastError.message : 'OpenRouter request failed.',
    questions: buildFallbackQuestions(setup)
  });
};