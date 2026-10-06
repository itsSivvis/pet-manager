import { Link as RouterLink } from 'react-router';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      emoji="🙈"
      title={t('notFound.title')}
      description={t('notFound.text')}
      action={
        <Button variant="contained" component={RouterLink} to="/">
          {t('nav.dashboard')}
        </Button>
      }
    />
  );
}
