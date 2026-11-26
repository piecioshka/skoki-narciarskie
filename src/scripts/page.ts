// Small helpers shared by the browser scripts.
import { isLang, type Lang } from '../i18n';

export function getLang(): Lang {
  const { lang } = document.documentElement;

  return isLang(lang) ? lang : 'pl';
}

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the preference is then per page.
  }
}
