const API_BASE_URL_KEY = 'roomquest_api_base_url';
const API_BASE_URL_OVERRIDE_KEY = 'roomquest_api_base_url_override';
const DEFAULT_API_URL = '';
const PRODUCTION_API_URL = '';

// If a previous build saved a backend URL that breaks the visitor flow,
// we automatically fall back to the default unless the user explicitly
// re-saves the URL in Settings (which sets the override flag).
const DEPRECATED_API_URLS = new Set<string>([
  'https://roomquest-id-backend.vercel.app',
  'http://localhost:3000',
]);

export const getApiBaseUrl = (): string => {
  const stored = localStorage.getItem(API_BASE_URL_KEY);
  const overrideEnabled = localStorage.getItem(API_BASE_URL_OVERRIDE_KEY) === '1';

  // Determine the default URL based on environment
  // In production (Vite build), we use '' to refer to the same origin
  const defaultUrl = import.meta.env.PROD ? '' : DEFAULT_API_URL;

  if (stored && DEPRECATED_API_URLS.has(stored) && !overrideEnabled) {
    localStorage.removeItem(API_BASE_URL_KEY);
    return defaultUrl;
  }

  return stored || defaultUrl;
};

export const setApiBaseUrl = (url: string): void => {
  localStorage.setItem(API_BASE_URL_KEY, url);
  localStorage.setItem(API_BASE_URL_OVERRIDE_KEY, '1');
};

export const clearApiBaseUrlOverride = (): void => {
  localStorage.removeItem(API_BASE_URL_OVERRIDE_KEY);
};
