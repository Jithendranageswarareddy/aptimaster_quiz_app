/*
  Purpose: Central score calculation module for quiz results.

  Why this module exists:
  - Keeps score/business logic separate from UI rendering.
  - Makes result calculations reusable across pages/services.
*/

function getPerformanceStatus(percentage) {
  if (percentage < 40) return 'beginner';
  if (percentage < 75) return 'intermediate';
  return 'advanced';
}

export function buildQuizResult(questions, answersByQuestionId) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const safeAnswers = answersByQuestionId || {};

  const answerReview = safeQuestions.map((question) => {
    const selectedAnswer = safeAnswers[question.id] || 'Not Answered';
    const correctAnswer = question.answer;
    const isCorrect = selectedAnswer === correctAnswer;

    return {
      questionId: question.id,
      questionText: question.question,
      selectedAnswer,
      correctAnswer,
      isCorrect,
      explanation: question.explanation || ''
    };
  });

  const correctAnswers = answerReview.filter((item) => item.isCorrect).length;
  const wrongAnswers = safeQuestions.length - correctAnswers;
  const totalScore = correctAnswers;
  const totalQuestions = safeQuestions.length;
  const percentage = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);
  const performanceStatus = getPerformanceStatus(percentage);

  return {
    totalScore,
    correctAnswers,
    wrongAnswers,
    totalQuestions,
    percentage,
    performanceStatus,
    answerReview
  };
}
