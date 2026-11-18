import { useContext } from 'react';
import { ThemeContext } from '../context/theme-context';

/** const { dark, toggle } = useTheme(); */
export default function useTheme() {
  return useContext(ThemeContext);
}
