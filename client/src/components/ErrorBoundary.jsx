import { Component } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { withTranslation } from 'react-i18next';

/** Shows a message instead of a blank page when a component crashes while rendering. */
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    const { t, children } = this.props;
    if (!this.state.error) return children;
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
          }
        >
          {t('errors.UNKNOWN')}
        </Alert>
      </Box>
    );
  }
}

const TranslatedErrorBoundary = withTranslation()(ErrorBoundary);
export default TranslatedErrorBoundary;
