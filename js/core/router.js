/*
  Purpose: Tiny route resolver for static multi-page setup.
*/

export function getRoute(pathname) {
  if (pathname.endsWith('/pages/quiz.html')) return 'quiz';
  if (pathname.endsWith('/pages/result.html')) return 'result';
  return 'home';
}
