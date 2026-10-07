import { useState } from 'react';
import { Navigate, Link as RouterLink, useLocation } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useErrorMessage } from '../lib/useErrorMessage.js';
import Logo from '../components/Logo.jsx';
import ThemePicker from '../components/ThemePicker.jsx';
import LanguagePicker from '../components/LanguagePicker.jsx';

/** Login, registration and first-run setup (first account becomes admin). */
export default function Login({ mode: initialMode = 'login' }) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const errorMessage = useErrorMessage();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', display_name: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const setupRequired = auth.status?.setupRequired;
  const mode = setupRequired ? 'setup' : initialMode;
  if (auth.user && !auth.user.anonymous)
    return <Navigate to={location.state?.from ?? '/'} replace />;

  const isRegister = mode !== 'login';
  if (mode === 'register' && auth.status && !auth.status.registrationOpen)
    return <Navigate to="/login" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isRegister) await auth.register({ ...form, locale: i18n.resolvedLanguage });
      else await auth.login(form.email, form.password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const field = (name, props) => (
    <TextField
      {...props}
      name={name}
      fullWidth
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
    />
  );

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', justifyContent: 'center', mb: 3 }}
        >
          <Logo size={44} />
          <Typography variant="h4" component="p">
            {t('app.name')}
          </Typography>
        </Stack>
        <Card>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Typography variant="h5" component="h1" gutterBottom>
              {t(`auth.title.${mode}`)}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              {t(`auth.subtitle.${mode}`)}
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage(error)}
              </Alert>
            )}
            <Box component="form" onSubmit={submit} noValidate>
              <Stack spacing={2}>
                {isRegister &&
                  field('display_name', {
                    label: t('auth.displayName'),
                    autoComplete: 'name',
                    required: true,
                  })}
                {field('email', {
                  label: t('auth.email'),
                  type: 'email',
                  autoComplete: 'email',
                  required: true,
                })}
                {field('password', {
                  label: t('auth.password'),
                  type: 'password',
                  required: true,
                  autoComplete: isRegister ? 'new-password' : 'current-password',
                  helperText: isRegister ? t('auth.passwordHint') : undefined,
                })}
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  {t(`auth.submit.${mode}`)}
                </Button>
              </Stack>
            </Box>
            {!setupRequired && auth.status?.registrationOpen && (
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                {mode === 'login' ? (
                  <Link component={RouterLink} to="/register">
                    {t('auth.noAccount')}
                  </Link>
                ) : (
                  <Link component={RouterLink} to="/login">
                    {t('auth.haveAccount')}
                  </Link>
                )}
              </Typography>
            )}
            {auth.status?.anonymousMode && (
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                <Link component={RouterLink} to="/">
                  {t('auth.continueWithoutLogin')}
                </Link>
              </Typography>
            )}
          </CardContent>
        </Card>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <LanguagePicker size="small" />
        </Box>
        <Box sx={{ mt: 2 }}>
          <ThemePicker compact />
        </Box>
      </Box>
    </Box>
  );
}
