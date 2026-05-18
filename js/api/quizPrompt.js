/*
  Purpose: Centralized quiz prompt templates for AI question generation.
  Keeping prompts here makes OpenRouter integration easier to maintain.
*/

import { getAppConfig } from '../core/runtimeConfig.js';
import { getTopicPromptLabel, normalizeCategoryTopicSelection } from '../services/topicService.js';

export function buildQuizPrompt(setup, config = getAppConfig()) {
  const category = setup?.category || 'mixed';
  const topic = setup?.topic || '';
  const difficulty = setup?.difficulty || 'medium';
  const questionCount = Math.min(Number(setup?.questionCount) || config.MAX_QUESTIONS, config.MAX_QUESTIONS);
  const normalizedSelection = normalizeCategoryTopicSelection(category, topic);
  const activeCategory = normalizedSelection.category;
  const activeTopic = normalizedSelection.topic?.value || topic;
  const topicLabel = normalizedSelection.topic?.label || getTopicPromptLabel(activeTopic, activeCategory);

  return `Return exactly ${questionCount} realistic ${difficulty} aptitude multiple-choice questions as STRICT JSON ONLY.

Hard output rules:
- The first character must be [
- The last character must be ]
- Do not write markdown.
- Do not write code fences.
- Do not write reasoning.
- Do not write labels such as "JSON:" or "Here is".
- Do not include any text before or after the JSON array.

Question rules:
- Category: ${activeCategory}
- Topic: ${topicLabel}
- Every question must stay within "${topicLabel}".
- Avoid generic phrases such as "Topic focus" or "typical aptitude question".
- Avoid repeating the same pattern across questions.
- Each question must have exactly four unique options.
- The answer must exactly match one option string.
- Use simple English suitable for aptitude practice.

Required JSON shape:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "answer": "string"
  }
]`;
}
