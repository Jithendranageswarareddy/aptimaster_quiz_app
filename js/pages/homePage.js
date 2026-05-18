/*
  Purpose: Home page controller.
  Attach setup form listeners and preserve selected options.
*/

import { safeReadStorage, safeWriteStorage } from '../core/runtimeConfig.js';
import { getAppConfig } from '../core/runtimeConfig.js';
import {
  getCategoryOptions,
  getDefaultTopicForCategory,
  getTopicsByCategory,
  normalizeCategoryTopicSelection,
  isValidTopicForCategory
} from '../services/topicService.js';

export function initHomePage() {
  const appConfig = getAppConfig();

  const form = document.getElementById('quiz-setup-form');
  const categoryInputs = Array.from(document.querySelectorAll('input[name="category"]'));
  const topicSelect = document.getElementById('topic');
  if (!form) return;
  const startQuizButton = form.querySelector('.setup-form__submit');

  const queryParams = new URLSearchParams(window.location.search);
  const savedSetup = readSavedSetup();
  const initialCategory = queryParams.get('category') || savedSetup.category || 'quantitative';
  const initialTopic = queryParams.get('topic') || savedSetup.topic || '';
  const initialDifficulty = queryParams.get('difficulty') || savedSetup.difficulty || 'medium';
  const initialQuestionCount = queryParams.get('questionCount') || savedSetup.questionCount || '10';
  const initialSelection = normalizeCategoryTopicSelection(initialCategory, initialTopic);

  initializeCategoryOptions(initialSelection.category);
  initializeTopicOptions(initialSelection.category, initialSelection.topic?.value || initialTopic);

  const difficultySelect = document.getElementById('difficulty');
  const questionCountInputs = Array.from(document.querySelectorAll('input[name="questionCount"]'));

  if (difficultySelect) {
    difficultySelect.value = initialDifficulty;
  }

  setQuestionCountValue(initialQuestionCount);

  categoryInputs.forEach((categoryInput) => {
    categoryInput.addEventListener('change', () => {
      initializeTopicOptions(getSelectedCategory());
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const category = String(formData.get('category') || 'mixed');
    const topic = String(formData.get('topic') || '');
    const normalizedSelection = normalizeCategoryTopicSelection(category, topic);
    const quizSetup = {
      category: normalizedSelection.category,
      topic: normalizedSelection.topic?.value || topic,
      difficulty: String(formData.get('difficulty') || 'medium'),
      questionCount: Math.min(Number(formData.get('questionCount') || 10), appConfig.MAX_QUESTIONS)
    };

    if (!isValidTopicForCategory(normalizedSelection.category, normalizedSelection.topic?.value)) {
      initializeTopicOptions(normalizedSelection.category);
      if (topicSelect) {
        topicSelect.value = normalizedSelection.topic?.value || '';
      }
    }

    quizSetup.topic = normalizedSelection.topic?.value || getDefaultTopicForCategory(category)?.value || '';

    // Store setup details so quiz page can load with selected preferences.
    const saved = safeWriteStorage('aptimaster_quiz_setup', JSON.stringify(quizSetup));
    if (!saved) {
      console.warn('Unable to persist quiz setup in localStorage.');
    }

    const query = new URLSearchParams({
      category: quizSetup.category,
      topic: quizSetup.topic,
      difficulty: quizSetup.difficulty,
      questionCount: String(quizSetup.questionCount)
    });

    if (startQuizButton) {
      startQuizButton.disabled = true;
      startQuizButton.textContent = 'Preparing quiz...';
      startQuizButton.setAttribute('aria-busy', 'true');
    }

    window.location.href = `./pages/quiz.html?${query.toString()}`;
  });

  function initializeCategoryOptions(defaultCategory) {
    const options = getCategoryOptions();
    const optionValues = new Set(options.map((option) => option.value));
    const nextCategory = optionValues.has(defaultCategory) ? defaultCategory : 'quantitative';

    categoryInputs.forEach((categoryInput) => {
      categoryInput.checked = categoryInput.value === nextCategory;
    });
  }

  function setQuestionCountValue(questionCount) {
    const nextValue = String(questionCount || '10');
    const hasOption = questionCountInputs.some((input) => input.value === nextValue);
    const safeValue = hasOption ? nextValue : '10';

    questionCountInputs.forEach((input) => {
      input.checked = input.value === safeValue;
    });
  }

  function getSelectedCategory() {
    return document.querySelector('input[name="category"]:checked')?.value || 'quantitative';
  }

  function initializeTopicOptions(category, selectedTopic = '') {
    if (!topicSelect) return;

    const topics = getTopicsByCategory(category);
    topicSelect.disabled = false;
    topicSelect.innerHTML = [
      '<option value="">Select a topic</option>',
      ...topics.map((topic) => `<option value="${topic.value}">${topic.label}</option>`)
    ].join('');

    const selection = normalizeCategoryTopicSelection(category, selectedTopic);
    topicSelect.value = selection.topic?.value || getDefaultTopicForCategory(category)?.value || '';
  }

  function readSavedSetup() {
    const raw = safeReadStorage('aptimaster_quiz_setup', '');
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Stored quiz setup could not be parsed.', error);
      return {};
    }
  }

}
