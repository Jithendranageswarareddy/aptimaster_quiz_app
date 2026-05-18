/*
  Purpose: Core quiz business logic (framework-independent).

  This module manages:
  - current question index
  - selected answers
  - score calculation
  - completion detection
  - navigation rules (no skipping without answer)

  Keeping this logic separate makes UI code simpler and easier to test.
*/

export function createQuizEngine(questions, initialState = null) {
  const safeQuestions = Array.isArray(questions) ? questions : [];

  const state = {
    currentQuestionIndex: initialState?.currentQuestionIndex || 0,
    selectedAnswers: initialState?.selectedAnswers || {}
  };

  function getCurrentQuestion() {
    return safeQuestions[state.currentQuestionIndex] || null;
  }

  function selectAnswer(optionValue) {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    state.selectedAnswers[currentQuestion.id] = optionValue;
  }

  function hasAnsweredCurrentQuestion() {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return false;

    return Boolean(state.selectedAnswers[currentQuestion.id]);
  }

  function canGoPrevious() {
    return state.currentQuestionIndex > 0;
  }

  function goPrevious() {
    if (!canGoPrevious()) return false;

    state.currentQuestionIndex -= 1;
    return true;
  }

  function canGoNext() {
    // Core rule: user must select an answer before moving forward.
    return hasAnsweredCurrentQuestion();
  }

  function isLastQuestion() {
    return state.currentQuestionIndex === safeQuestions.length - 1;
  }

  function goNext() {
    if (!canGoNext()) return { moved: false, reason: 'missing-answer' };

    if (!isLastQuestion()) {
      state.currentQuestionIndex += 1;
      return { moved: true, completed: false };
    }

    return { moved: true, completed: true };
  }

  function getSelectedOptionForCurrentQuestion() {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return undefined;

    return state.selectedAnswers[currentQuestion.id];
  }

  function getSnapshot() {
    return {
      currentQuestionIndex: state.currentQuestionIndex,
      selectedAnswers: { ...state.selectedAnswers }
    };
  }

  return {
    getCurrentQuestion,
    getSelectedOptionForCurrentQuestion,
    hasAnsweredCurrentQuestion,
    selectAnswer,
    canGoPrevious,
    goPrevious,
    canGoNext,
    goNext,
    isLastQuestion,
    getSnapshot
  };
}
