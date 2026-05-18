/*
  Purpose: Topic management service for AptiMaster.

  This module keeps the category/topic structure centralized so:
  - the UI can populate dropdowns dynamically,
  - the quiz generator can validate category-topic combinations,
  - and mock/OpenRouter question generation can stay topic-aware.
*/

import { QUANTITATIVE_TOPICS } from '../data/quantitativeTopics.js';
import { VERBAL_TOPICS } from '../data/verbalTopics.js';
import { LOGICAL_TOPICS } from '../data/logicalTopics.js';

export const TOPIC_CATEGORIES = {
  quantitative: {
    value: 'quantitative',
    label: 'Quantitative Aptitude',
    topics: QUANTITATIVE_TOPICS
  },
  verbal: {
    value: 'verbal',
    label: 'Verbal Ability',
    topics: VERBAL_TOPICS
  },
  logical: {
    value: 'logical',
    label: 'Logical Reasoning',
    topics: LOGICAL_TOPICS
  }
};

function cloneTopics(topics) {
  return topics.map((topic) => ({ ...topic }));
}

export function getCategoryOptions() {
  return [
    { value: 'quantitative', label: 'Quantitative Aptitude' },
    { value: 'verbal', label: 'Verbal Ability' },
    { value: 'logical', label: 'Logical Reasoning' },
    { value: 'mixed', label: 'Mixed Practice' }
  ];
}

export function getAllTopicOptions() {
  return [
    ...cloneTopics(QUANTITATIVE_TOPICS),
    ...cloneTopics(VERBAL_TOPICS),
    ...cloneTopics(LOGICAL_TOPICS)
  ];
}

export function getTopicsByCategory(category) {
  if (category === 'mixed') {
    return getAllTopicOptions();
  }

  return cloneTopics(TOPIC_CATEGORIES[category]?.topics || []);
}

export function getDefaultTopicForCategory(category) {
  const topics = getTopicsByCategory(category);
  return topics[0] || null;
}

export function findTopicByValue(category, topicValue) {
  const topics = getTopicsByCategory(category);
  return topics.find((topic) => topic.value === topicValue) || null;
}

export function isValidCategory(category) {
  return category === 'mixed' || Boolean(TOPIC_CATEGORIES[category]);
}

export function isValidTopicForCategory(category, topicValue) {
  if (!isValidCategory(category) || !topicValue) return false;
  return Boolean(findTopicByValue(category, topicValue));
}

export function normalizeCategoryTopicSelection(category, topicValue) {
  if (!isValidCategory(category)) {
    return {
      category: 'mixed',
      topic: getDefaultTopicForCategory('mixed')
    };
  }

  const validTopic = isValidTopicForCategory(category, topicValue)
    ? findTopicByValue(category, topicValue)
    : getDefaultTopicForCategory(category);

  return {
    category,
    topic: validTopic
  };
}

export function getTopicPromptLabel(topicValue, category) {
  const topic = findTopicByValue(category, topicValue) || findTopicByValue('mixed', topicValue);
  return topic?.label || 'Mixed Practice';
}
