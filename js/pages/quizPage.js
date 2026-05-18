/*
  Purpose: Quiz page controller.
  Loads quiz data, tracks user selections, and handles navigation.
*/

import { getQuizQuestions, evaluateQuiz } from '../services/quizService.js';
import { saveQuizAttempt } from '../services/storageService.js';
import { renderQuizCard } from '../components/quizCard.js';
import { byId } from '../utils/helpers.js';
import { createQuizEngine } from '../core/quizEngine.js';
import { saveQuizState, loadQuizState, clearQuizState } from '../core/stateManager.js';
import { createTimerEngine } from '../core/timerEngine.js';
import { mountTimerUI, updateTimerUI } from '../components/timer.js';
import { renderAiStatus } from '../components/aiStatus.js';
import { safeReadStorage } from '../core/runtimeConfig.js';
import { getTopicPromptLabel, normalizeCategoryTopicSelection } from '../services/topicService.js';

const CATEGORY_LABELS = {
  quantitative: 'Quantitative',
  logical: 'Logical',
  verbal: 'Verbal',
  mixed: 'Mixed'
};

export async function initQuizPage() {
  const root = byId('quiz-root');
  const timerRoot = byId('timer-root');
  const aiStatusRoot = byId('ai-status-root');
  const sessionMetaRoot = byId('session-meta-root');
  if (!root) return;

  // Read setup chosen on homepage. Fallback values make this page usable directly.
  const setup = getQuizSetupFromStorage();

  let questions = [];
  let activeSource = getQuestionSourcePreference();

  // Show loading state while API generates questions.
  renderLoadingState(
    activeSource === 'mock'
      ? 'Preparing your practice set...'
      : 'Building your AI practice set...'
  );
  renderAiStatusBanner();
  renderSessionMeta();

  try {
    questions = await getQuizQuestions(setup, { source: activeSource });
  } catch (error) {
    console.warn('Question generation failed.', error);
    renderErrorState(
      'We could not prepare this set right now. Try again or continue with a ready practice set.'
    );
    attachPreQuizActionHandlers();
    return;
  }

  if (questions.length === 0) {
    root.innerHTML = '<p>No questions available right now.</p>';
    return;
  }

  renderAiStatusBanner();

  // Restore prior in-progress state when user returns to this page.
  const savedQuizState = loadQuizState();

  // Engine contains business logic. UI only calls engine functions.
  const engine = createQuizEngine(questions, savedQuizState);
  const sessionDurationInSeconds = getSessionDurationInSeconds(setup, questions.length);

  // Timer engine is separate from UI and quiz business logic.
  const timer = createTimerEngine({
    durationInSeconds: sessionDurationInSeconds,
    initialRemainingSeconds: savedQuizState?.timer?.remainingSeconds,
    onTick: (timerState) => {
      if (timerRoot) {
        updateTimerUI(timerRoot, timerState);
      }

      persistSessionState();
    },
    onComplete: async () => {
      uiMessage = 'Time is up. Submitting your quiz automatically.';
      await submitQuizAndRedirect();
    }
  });

  let uiMessage = '';
  let isSubmitting = false;

  if (timerRoot) {
    mountTimerUI(timerRoot, {
      onPauseToggle: () => {
        const timerState = timer.getSnapshot();

        if (timerState.isRunning) {
          timer.pause();
          return;
        }

        timer.start();
      },
      onReset: () => {
        timer.reset(sessionDurationInSeconds);
        timer.start();
      }
    });

    updateTimerUI(timerRoot, timer.getSnapshot());
  }

  // Start countdown for this quiz session.
  timer.start();

  renderCurrentQuestion();

  // Single event listener with event delegation for options and nav buttons.
  root.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const optionValue = target.getAttribute('data-option-value');
    if (optionValue) {
      engine.selectAnswer(optionValue);
      persistSessionState();
      uiMessage = '';
      renderCurrentQuestion();
      return;
    }

    const action = target.getAttribute('data-action');
    if (action === 'previous') {
      if (engine.goPrevious()) {
        persistSessionState();
        uiMessage = '';
        renderCurrentQuestion();
      }
      return;
    }

    if (action === 'next') {
      const nextState = engine.goNext();

      if (!nextState.moved && nextState.reason === 'missing-answer') {
        uiMessage = 'Please select an option before moving to the next question.';
        renderCurrentQuestion();
        return;
      }

      persistSessionState();

      if (!nextState.completed) {
        uiMessage = '';
        renderCurrentQuestion();
        return;
      }

      await submitQuizAndRedirect();
    }
  });

  // Keyboard support: 1-4 selects option, ArrowLeft previous, ArrowRight next.
  root.addEventListener('keydown', async (event) => {
    if (!(event.target instanceof HTMLElement)) return;

    const pressedKey = event.key;
    const question = engine.getCurrentQuestion();
    if (!question) return;

    if (pressedKey >= '1' && pressedKey <= '4') {
      const optionIndex = Number(pressedKey) - 1;
      const optionValue = question.options[optionIndex];
      if (!optionValue) return;

      engine.selectAnswer(optionValue);
      persistSessionState();
      uiMessage = '';
      renderCurrentQuestion();
      return;
    }

    if (pressedKey === 'ArrowLeft') {
      if (engine.goPrevious()) {
        persistSessionState();
        uiMessage = '';
        renderCurrentQuestion();
      }
      return;
    }

    if (pressedKey === 'ArrowRight') {
      const nextState = engine.goNext();

      if (!nextState.moved && nextState.reason === 'missing-answer') {
        uiMessage = 'Please select an option before moving to the next question.';
        renderCurrentQuestion();
        return;
      }

      persistSessionState();

      if (!nextState.completed) {
        uiMessage = '';
        renderCurrentQuestion();
        return;
      }

      await submitQuizAndRedirect();
    }
  });

  function renderCurrentQuestion() {
    const snapshot = engine.getSnapshot();
    const question = engine.getCurrentQuestion();
    if (!question) return;

    const selectedOption = engine.getSelectedOptionForCurrentQuestion();

    root.innerHTML = renderQuizCard(
      question,
      snapshot.currentQuestionIndex,
      questions.length,
      selectedOption,
      uiMessage
    );
  }

  function renderAiStatusBanner() {
    if (!aiStatusRoot) return;

    const source = safeReadStorage('aptimaster_question_source', activeSource === 'mock' ? 'mock' : 'ai');
    const fallbackMessage = safeReadStorage('aptimaster_ai_fallback_message', '');
    aiStatusRoot.innerHTML = renderAiStatus(source, fallbackMessage);
  }

  function renderSessionMeta() {
    if (!sessionMetaRoot) return;

    const topicLabel = getTopicPromptLabel(setup.topic, setup.category);
    const categoryLabel = CATEGORY_LABELS[setup.category] || 'Mixed';
    const difficultyLabel = capitalize(setup.difficulty || 'medium');
    const questionCount = Number(setup.questionCount) || questions.length || 10;

    sessionMetaRoot.innerHTML = `
      <div class="session-badges" aria-label="Selected practice setup">
        <span class="session-badge">${categoryLabel}</span>
        <span class="session-badge">${topicLabel}</span>
        <span class="session-badge">${difficultyLabel}</span>
        <span class="session-badge">${questionCount} Questions</span>
      </div>
    `;
  }

  function renderLoadingState(message) {
    root.innerHTML = `
      <section class="quiz-loading" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true" aria-label="Loading"></div>
        <p>${message}</p>
      </section>
    `;
  }

  function renderErrorState(message) {
    root.innerHTML = `
      <section class="quiz-error" role="alert">
        <h3>Question Load Failed</h3>
        <p>${message}</p>
        <div class="inline-actions">
          <button type="button" class="btn" data-prequiz-action="retry-generation">
            Try Again
          </button>
          <button type="button" class="btn btn-secondary" data-prequiz-action="use-mock">
            Continue Practice
          </button>
        </div>
      </section>
    `;
  }

  function attachPreQuizActionHandlers() {
    root.addEventListener(
      'click',
      async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const action = target.getAttribute('data-prequiz-action');
        if (!action) return;

        if (action === 'retry-generation') {
          activeSource = 'api';
        }

        if (action === 'use-mock') {
          activeSource = 'mock';
        }

        renderLoadingState(
          activeSource === 'mock' ? 'Preparing your practice set...' : 'Building your AI practice set...'
        );
        renderAiStatusBanner();

        try {
          questions = await getQuizQuestions(setup, { source: activeSource });
        } catch (error) {
          console.warn('Question generation retry failed.', error);
          renderErrorState('We could not prepare this set yet. Continue with a ready practice set or try again.');
          return;
        }

        if (questions.length === 0) {
          renderErrorState('No questions received. Try a different setup.');
          return;
        }

        renderAiStatusBanner();

        // Reload page once data source is ready so quiz session initializes cleanly.
        const nextUrl = new URL(window.location.href);
        if (activeSource === 'mock') {
          nextUrl.searchParams.set('source', 'practice');
        } else {
          nextUrl.searchParams.delete('source');
        }
        window.location.href = nextUrl.toString();
      }
    );
  }

  function getQuestionSourcePreference() {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('source') === 'practice' ? 'mock' : 'api';
  }

  async function submitQuizAndRedirect() {
    if (isSubmitting) return;
    isSubmitting = true;

    // Stop timer to prevent repeated timeout callbacks.
    timer.pause();

    const finalSnapshot = engine.getSnapshot();
    const result = await evaluateQuiz(questions, finalSnapshot.selectedAnswers);
    saveQuizAttempt(result, {
      category: setup.category,
      topic: setup.topic,
      difficulty: setup.difficulty,
      questionCount: setup.questionCount,
      timestamp: new Date().toISOString()
    });
    clearQuizState();
    timer.dispose();
    window.location.href = './result.html';
  }

  function persistSessionState() {
    saveQuizState({
      ...engine.getSnapshot(),
      timer: timer.getSnapshot()
    });
  }

  // Local helper keeps setup parsing logic close to page usage.
  function getQuizSetupFromStorage() {
    // Direct page loads on Vercel must still be able to bootstrap a session.
    const raw = safeReadStorage('aptimaster_quiz_setup', '');
    const queryParams = new URLSearchParams(window.location.search);

    if (!raw) {
      const category = queryParams.get('category') || 'mixed';
      const topic = queryParams.get('topic') || '';
      const normalizedSelection = normalizeCategoryTopicSelection(category, topic);

      return {
        category: normalizedSelection.category,
        topic: normalizedSelection.topic?.value || topic,
        difficulty: queryParams.get('difficulty') || 'medium',
        questionCount: Number(queryParams.get('questionCount') || 10)
      };
    }

    try {
      const parsed = JSON.parse(raw);
      const category = parsed.category || queryParams.get('category') || 'mixed';
      const topic = parsed.topic || queryParams.get('topic') || '';
      const normalizedSelection = normalizeCategoryTopicSelection(category, topic);

      return {
        ...parsed,
        category: normalizedSelection.category,
        topic: normalizedSelection.topic?.value || topic
      };
    } catch (error) {
      console.warn('Invalid quiz setup in storage, using defaults.', error);
      const fallbackCategory = queryParams.get('category') || 'mixed';
      const fallbackTopic = queryParams.get('topic') || '';
      const normalizedSelection = normalizeCategoryTopicSelection(fallbackCategory, fallbackTopic);

      return {
        category: normalizedSelection.category,
        topic: normalizedSelection.topic?.value || fallbackTopic,
        difficulty: queryParams.get('difficulty') || 'medium',
        questionCount: Number(queryParams.get('questionCount') || 10)
      };
    }
  }

  // Beginner rule of thumb: 45 seconds per question, with a minimum of 60 seconds.
  function getSessionDurationInSeconds(currentSetup, totalQuestions) {
    const configuredCount = Number(currentSetup?.questionCount) || totalQuestions;
    return Math.max(60, configuredCount * 45);
  }

  function capitalize(value) {
    const text = String(value || '');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }
}
