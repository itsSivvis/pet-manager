import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { get, put, post } from '../../api/client.js';
import { useErrorMessage } from '../../lib/useErrorMessage.js';
import Section from '../../components/Section.jsx';
import QueryState from '../../components/QueryState.jsx';

const KEY = ['household', 'settings'];

/** ntfy push notifications of the own household. */
export default function NotificationsSection() {
  const { t } = useTranslation();
  const settings = useQuery({ queryKey: KEY, queryFn: () => get('/household/settings') });
  return (
    <Section title={t('household.ntfy.title')} description={t('household.ntfy.description')}>
      <QueryState query={settings}>{(s) => <NtfyForm settings={s} />}</QueryState>
    </Section>
  );
}

function NtfyForm({ settings }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState({ ...settings.ntfy, token: undefined });
  const [locale, setLocale] = useState(settings.notificationLocale ?? '');
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const ntfy = { enabled: form.enabled, url: form.url, topic: form.topic };
      if (form.token !== undefined) ntfy.token = form.token;
      const updated = await put('/household/settings', {
        ntfy,
        notificationLocale: locale || null,
      });
      queryClient.setQueryData(KEY, updated);
      // Show what the server stored (the token itself is never sent back).
      setForm({ ...updated.ntfy, token: undefined });
      setMsg({ severity: 'success', text: t('common.saved') });
    } catch (err) {
      setMsg({ severity: 'error', text: errorMessage(err) });
    }
  };
  const test = async () => {
    setMsg(null);
    try {
      await post('/household/ntfy/test');
      setMsg({ severity: 'success', text: t('household.ntfy.testSent') });
    } catch (err) {
      setMsg({ severity: 'error', text: errorMessage(err) });
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={submit} sx={{ maxWidth: 560 }}>
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(form.enabled)}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
        }
        label={t('household.ntfy.enabled')}
      />
      <TextField
        label={t('household.ntfy.url')}
        placeholder="https://ntfy.example.com"
        value={form.url ?? ''}
        onChange={(e) => setForm({ ...form, url: e.target.value })}
        helperText={t('household.ntfy.urlHint')}
      />
      <TextField
        label={t('household.ntfy.topic')}
        placeholder="my-pets-7f3a"
        value={form.topic ?? ''}
        onChange={(e) => setForm({ ...form, topic: e.target.value })}
        helperText={t('household.ntfy.topicHint')}
      />
      <TextField
        type="password"
        autoComplete="off"
        label={t('household.ntfy.token')}
        value={form.token ?? ''}
        placeholder={settings.ntfy.hasToken ? '••••••••' : ''}
        onChange={(e) => setForm({ ...form, token: e.target.value })}
        helperText={
          settings.ntfy.hasToken ? t('household.ntfy.tokenStored') : t('household.ntfy.tokenHint')
        }
      />
      <TextField
        select
        label={t('household.ntfy.language')}
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
      >
        <MenuItem value="">{t('household.ntfy.languageDefault')}</MenuItem>
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="de">Deutsch</MenuItem>
      </TextField>
      {msg && <Alert severity={msg.severity}>{msg.text}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained">
          {t('common.save')}
        </Button>
        <Button onClick={test} disabled={!settings.ntfy.topic}>
          {t('household.ntfy.test')}
        </Button>
      </Stack>
    </Stack>
  );
}
