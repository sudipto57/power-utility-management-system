import { createContext } from 'react';

// Holds { dark, toggle }. Use it through hooks/useTheme.js
export const ThemeContext = createContext(null);
