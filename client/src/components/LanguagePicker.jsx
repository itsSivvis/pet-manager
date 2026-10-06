import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/index.js';
import { patch } from '../api/client.js';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function LanguagePicker({ size = 'medium' }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth() ?? {};
  return (
    <TextField
      select
      size={size}
      label={t('settings.language')}
      value={i18n.resolvedLanguage ?? 'en'}
      onChange={(e) => {
        i18n.changeLanguage(e.target.value);
        // Also store it in the profile (used e.g. after logging in on a new device).
        if (user && !user.anonymous) patch('/auth/me', { locale: e.target.value }).catch(() => {});
      }}
      sx={{ minWidth: 180 }}
    >
      {LANGUAGES.map((l) => (
        <MenuItem key={l.code} value={l.code} lang={l.code}>
          {l.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
