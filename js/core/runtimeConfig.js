/*
  Purpose: Browser runtime helpers for deployment-safe configuration and storage.

  Deployment considerations:
  - Browser code should never receive secret environment variables.
  - localStorage access is wrapped so the app does not crash in restricted modes.
*/

function getBrowserWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function getBrowserDocument() {
  return typeof document !== 'undefined' ? document : null;
}

export const APP_CONFIG = {
  API_TIMEOUT: 30000,
  RETRY_LIMIT: 2,
  MAX_QUESTIONS: 20,
  MAX_TOKENS: 3500,
  RETRY_DELAY_MS: 1800,
  DEFAULT_TEMPERATURE: 0.1
};

export function isBrowserEnvironment() {
  return Boolean(getBrowserWindow());
}

export function getRuntimeConfig() {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) return {};

  return browserWindow.__APTI_MASTER_CONFIG__ || browserWindow.__APTIMASTER_CONFIG__ || {};
}

export function getAppConfig() {
  const runtimeConfig = getRuntimeConfig();

  return {
    ...APP_CONFIG,
    ...runtimeConfig,
    API_TIMEOUT: Number(runtimeConfig.API_TIMEOUT || runtimeConfig.apiTimeout || APP_CONFIG.API_TIMEOUT),
    RETRY_LIMIT: Number(runtimeConfig.RETRY_LIMIT || runtimeConfig.retryLimit || APP_CONFIG.RETRY_LIMIT),
    MAX_QUESTIONS: Number(runtimeConfig.MAX_QUESTIONS || runtimeConfig.maxQuestions || APP_CONFIG.MAX_QUESTIONS),
    MAX_TOKENS: Number(runtimeConfig.MAX_TOKENS || runtimeConfig.maxTokens || APP_CONFIG.MAX_TOKENS),
    RETRY_DELAY_MS: Number(runtimeConfig.RETRY_DELAY_MS || runtimeConfig.retryDelayMs || APP_CONFIG.RETRY_DELAY_MS),
    DEFAULT_TEMPERATURE: Number(
      runtimeConfig.DEFAULT_TEMPERATURE || runtimeConfig.defaultTemperature || APP_CONFIG.DEFAULT_TEMPERATURE
    )
  };
}

export function safeReadStorage(key, fallback = null) {
  const browserWindow = getBrowserWindow();
  if (!browserWindow?.localStorage) return fallback;

  try {
    const raw = browserWindow.localStorage.getItem(key);
    return raw ? raw : fallback;
  } catch (error) {
    console.warn(`Unable to read localStorage key: ${key}`, error);
    return fallback;
  }
}

export function safeWriteStorage(key, value) {
  const browserWindow = getBrowserWindow();
  if (!browserWindow?.localStorage) return false;

  try {
    browserWindow.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Unable to write localStorage key: ${key}`, error);
    return false;
  }
}

export function safeRemoveStorage(key) {
  const browserWindow = getBrowserWindow();
  if (!browserWindow?.localStorage) return false;

  try {
    browserWindow.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Unable to remove localStorage key: ${key}`, error);
    return false;
  }
}

export function getDocumentTitleFallback() {
  const browserDocument = getBrowserDocument();
  return browserDocument?.title || 'AptiMaster';
}
