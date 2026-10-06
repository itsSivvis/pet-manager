import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

const THRESHOLD = 70;

/** Touch pull-to-refresh: refetches all active queries (PWA has no reload button). */
export default function PullToRefresh({ children }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const start = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <Box
      onTouchStart={(e) => {
        start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
      }}
      onTouchMove={(e) => {
        if (start.current == null || refreshing) return;
        const dy = e.touches[0].clientY - start.current;
        setPull(dy > 0 ? Math.min(dy * 0.5, THRESHOLD * 1.4) : 0);
      }}
      onTouchEnd={async () => {
        if (pull >= THRESHOLD) {
          setRefreshing(true);
          await queryClient.refetchQueries({ type: 'active' });
          setRefreshing(false);
        }
        setPull(0);
        start.current = null;
      }}
    >
      <Box
        aria-live="polite"
        sx={{
          height: refreshing ? 48 : pull,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: pull ? 'none' : 'height 200ms ease',
        }}
      >
        {(pull > 0 || refreshing) && (
          <CircularProgress
            size={24}
            variant={refreshing ? 'indeterminate' : 'determinate'}
            value={Math.min((pull / THRESHOLD) * 100, 100)}
            aria-label={t('common.refreshing')}
          />
        )}
      </Box>
      {children}
    </Box>
  );
}
