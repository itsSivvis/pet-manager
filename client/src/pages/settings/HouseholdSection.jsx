import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { get, patch, post, del } from '../../api/client.js';
import { useErrorMessage } from '../../lib/useErrorMessage.js';
import Section from '../../components/Section.jsx';
import QueryState from '../../components/QueryState.jsx';
import InviteLink from '../../components/InviteLink.jsx';

const KEY = ['household'];

/** Name, members and invite link of the own household. */
export default function HouseholdSection() {
  const { t } = useTranslation();
  const household = useQuery({ queryKey: KEY, queryFn: () => get('/household') });
  return (
    <Section title={t('household.title')} description={t('household.description')}>
      <QueryState query={household}>{(h) => <HouseholdForm household={h} />}</QueryState>
    </Section>
  );
}

function HouseholdForm({ household }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [name, setName] = useState(household.name);
  const [msg, setMsg] = useState(null);

  const run = async (fn, success) => {
    setMsg(null);
    try {
      queryClient.setQueryData(KEY, await fn());
      if (success) setMsg({ severity: 'success', text: success });
    } catch (err) {
      setMsg({ severity: 'error', text: errorMessage(err) });
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        component="form"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => patch('/household', { name }), t('common.saved'));
        }}
      >
        <TextField
          label={t('household.name')}
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="outlined">
          {t('common.save')}
        </Button>
      </Stack>
      {msg && <Alert severity={msg.severity}>{msg.text}</Alert>}

      <Box>
        <Typography variant="subtitle2" component="h3">
          {t('household.members')}
        </Typography>
        <List dense disablePadding>
          {household.members.map((m) => (
            <ListItem key={m.id} disableGutters divider>
              <ListItemText
                primary={m.display_name}
                secondary={m.email}
                slotProps={{ secondary: { sx: { overflowWrap: 'anywhere' } } }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box>
        <Typography variant="subtitle2" component="h3">
          {t('household.invite.title')}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
          {t('household.invite.description')}
        </Typography>
        {household.invite_code ? (
          <Stack spacing={1.5}>
            <InviteLink code={household.invite_code} label={t('household.invite.link')} />
            <Stack direction="row" spacing={1}>
              <Button onClick={() => run(() => post('/household/invite'))}>
                {t('household.invite.renew')}
              </Button>
              <Button color="error" onClick={() => run(() => del('/household/invite'))}>
                {t('household.invite.disable')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Button variant="outlined" onClick={() => run(() => post('/household/invite'))}>
            {t('household.invite.create')}
          </Button>
        )}
      </Box>
    </Stack>
  );
}
