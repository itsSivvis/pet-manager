import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Self-hosted fonts (bundled, no requests to third-party CDNs).
import '@fontsource-variable/inter';
import '@fontsource-variable/nunito';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import './i18n/index.js';
import './global.css';
import { ThemeModeProvider } from './theme/ThemeModeProvider.jsx';
import { AuthProvider } from './auth/AuthProvider.jsx';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => count < 2 && (error?.status ?? 0) >= 500,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
