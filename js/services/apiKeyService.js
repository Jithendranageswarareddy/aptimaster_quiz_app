/*
  Purpose: Frontend-only OpenRouter API key storage helper.
  Runtime config remains primary; this localStorage value is an optional browser fallback.
*/

import { safeReadStorage, safeWriteStorage, safeRemoveStorage } from '../core/runtimeConfig.js';

const API_KEY_STORAGE_KEY = 'aptimaster_openrouter_api_key';

export function loadApiKey() {
  return String(safeReadStorage(API_KEY_STORAGE_KEY, '') || '').trim();
}

export function saveApiKey(apiKey) {
  const normalizedKey = String(apiKey || '').trim();
  if (!normalizedKey) return false;

  return safeWriteStorage(API_KEY_STORAGE_KEY, normalizedKey);
}

export function removeApiKey() {
  return safeRemoveStorage(API_KEY_STORAGE_KEY);
}

export function hasApiKey() {
  return validateApiKeyExistence(loadApiKey());
}

export function validateApiKeyExistence(apiKey = loadApiKey()) {
  return Boolean(String(apiKey || '').trim());
}
