import { useTranslation } from 'react-i18next';

/** Translates an ApiError (by code) into a user-facing message. */
export function useErrorMessage() {
  const { t } = useTranslation();
  return (error) => {
    if (!error) return '';
    const code = error.code || 'UNKNOWN';
    return t(`errors.${code}`, { defaultValue: t('errors.UNKNOWN') });
  };
}
