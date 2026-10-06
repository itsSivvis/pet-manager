import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../lib/useErrorMessage.js';

/** Renders loading/error states for a react-query result, else children. */
export default function QueryState({ query, children }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  if (query.isPending) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
        role="status"
        aria-label={t('common.loading')}
      >
        <CircularProgress />
      </Box>
    );
  }
  if (query.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => query.refetch()}>
            {t('common.retry')}
          </Button>
        }
      >
        {errorMessage(query.error)}
      </Alert>
    );
  }
  return children(query.data);
}
