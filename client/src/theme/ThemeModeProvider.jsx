import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './createAppTheme.js';
import { resolveThemeId } from './resolveThemeId.js';
import { storage } from '../lib/storage.js';

export const THEME_STORAGE_KEY = 'pm.theme';
const ThemeModeContext = createContext(null);

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');
function subscribeSystem(cb) {
  const mq = darkQuery();
  mq?.addEventListener('change', cb);
  return () => mq?.removeEventListener('change', cb);
}

export function ThemeModeProvider({ children }) {
  const [choice, setChoice] = useState(() => storage.get(THEME_STORAGE_KEY) || 'system');
  const prefersDark = useSyncExternalStore(
    subscribeSystem,
    () => Boolean(darkQuery()?.matches),
    () => false,
  );
  const themeId = resolveThemeId(choice, prefersDark);
  const theme = useMemo(() => createAppTheme(themeId), [themeId]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    root.style.backgroundColor = theme.palette.background.default;
    root.style.colorScheme = theme.palette.mode;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme.palette.background.default);
  }, [themeId, theme]);

  const value = useMemo(
    () => ({
      choice,
      themeId,
      setChoice: (next) => {
        setChoice(next);
        storage.set(THEME_STORAGE_KEY, next);
      },
    }),
    [choice, themeId],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeMode() {
  return useContext(ThemeModeContext);
}
