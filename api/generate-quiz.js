const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash:free';
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_LIMIT = 2;
const MAX_QUESTIONS = 20;
const FALLBACK_MESSAGE = 'A fresh practice set is ready.';

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

  return Array.from({ length: questionCount }, (_, index) => ({
    id: index + 1,
    category,
    topic: normalizeText(setup.topic),
    difficulty,
    ...buildFallbackQuestion(topicLabel, difficulty, index)
  }));
}

async function callOpenRouter(setup, apiKey) {
  const questionCount = Math.max(1, Math.min(Number(setup.questionCount) || 10, MAX_QUESTIONS));
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
    max_tokens: 3600,
    response_format: buildResponseSchema(questionCount)
  };

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://vercel.app',
        'X-Title': 'AptiMaster'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`OpenRouter request failed (${response.status}): ${errorText}`);
      error.code = response.status === 429 ? 'OPENROUTER_RATE_LIMIT' : 'OPENROUTER_HTTP_ERROR';
      throw error;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenRouter response did not contain question content.');
    }

    const parsed = JSON.parse(cleanModelContent(content));
    const questions = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;

    if (!questions) {
      throw new Error('OpenRouter returned an invalid question payload.');
    }

    return validateQuestionSet(questions, questionCount).map((question, index) => ({
      id: index + 1,
      category: normalizeText(setup.category) || 'mixed',
      topic: normalizeText(setup.topic),
      difficulty: normalizeText(setup.difficulty) || 'medium',
      ...question
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = async function generateQuiz(req, res) {
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
  const setup = {
    category: normalizeText(body.category) || 'mixed',
    topic: normalizeText(body.topic),
    difficulty: normalizeText(body.difficulty) || 'medium',
    questionCount: Math.max(1, Math.min(Number(body.questionCount) || 10, MAX_QUESTIONS))
  };

  if (!apiKey) {
    sendJson(res, 200, {
      source: 'fallback',
      fallbackMessage: FALLBACK_MESSAGE,
      questions: buildFallbackQuestions(setup)
    });
    return;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    try {
      const questions = await callOpenRouter(setup, apiKey);
      sendJson(res, 200, {
        source: 'ai',
        questions
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  sendJson(res, 200, {
    source: 'fallback',
    fallbackMessage: FALLBACK_MESSAGE,
    questions: buildFallbackQuestions(setup),
    error: lastError ? lastError.message : 'OpenRouter request failed.'
  });
};