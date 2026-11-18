import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme-context';

// Same name as in index.html, which turns dark mode on before the page appears (no white flash)
const THEME_KEY = 'power_utility_theme';

function savedDarkMode() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false; // storage not available: start in light mode
  }
}

/** Remembers light / dark mode and puts class="dark" on <html> (index.css does the rest). */
export default function ThemeProvider({ children }) {
  const [dark, setDark] = useState(savedDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* storage not available: the choice is just not remembered */
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((value) => !value), []);
  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
