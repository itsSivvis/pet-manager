import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DataGrid } from '@mui/x-data-grid';
import { deDE } from '@mui/x-data-grid/locales';
import { useTranslation } from 'react-i18next';
import { get, put, post, patch, del } from '../api/client.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useCatalog } from '../api/hooks.js';
import { useErrorMessage } from '../lib/useErrorMessage.js';
import { formatDate, formatNumber } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import QueryState from '../components/QueryState.jsx';
import FormDialog from '../components/FormDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

function Section({ title, description, children }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function AccessSection({ settings, save }) {
  const { t } = useTranslation();
  const anonymous = settings.requireLogin === false;
  return (
    <Section title={t('admin.access.title')}>
      <Stack spacing={2}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={settings.requireLogin !== false}
                disabled={!settings.anonymousModeAllowed && settings.requireLogin !== false}
                onChange={(e) => save({ requireLogin: e.target.checked })}
              />
            }
            label={t('admin.access.requireLogin')}
          />
          <Alert severity="info" sx={{ mt: 1 }}>
            <AlertTitle>{t('admin.access.howItWorksTitle')}</AlertTitle>
            {t('admin.access.howItWorks')}
            {!settings.anonymousModeAllowed && (
              <Box component="p" sx={{ mb: 0 }}>
                {t('admin.access.envHint')} <code>ALLOW_ANONYMOUS_MODE=true</code>
              </Box>
            )}
          </Alert>
          {anonymous && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <AlertTitle>{t('admin.access.warningTitle')}</AlertTitle>
              {t('admin.access.warning')}
            </Alert>
          )}
        </Box>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={settings.allowRegistration === true}
                onChange={(e) => save({ allowRegistration: e.target.checked })}
              />
            }
            label={t('admin.access.allowRegistration')}
          />
          <Typography variant="body2" color="text.secondary">
            {t('admin.access.allowRegistrationHint')}
          </Typography>
        </Box>
      </Stack>
    </Section>
  );
}

function NtfySection({ settings, save }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState({ ...settings.ntfy, token: undefined });
  const [locale, setLocale] = useState(settings.notificationLocale ?? '');
  const [msg, setMsg] = useState(null);
  useEffect(() => setForm({ ...settings.ntfy, token: undefined }), [settings.ntfy]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const ntfy = { enabled: form.enabled, url: form.url, topic: form.topic };
      if (form.token !== undefined) ntfy.token = form.token;
      await save({ ntfy, notificationLocale: locale || null });
      setMsg({ severity: 'success', text: t('common.saved') });
    } catch (err) {
      setMsg({ severity: 'error', text: errorMessage(err) });
    }
  };
  const test = async () => {
    setMsg(null);
    try {
      await post('/admin/ntfy/test');
      setMsg({ severity: 'success', text: t('admin.ntfy.testSent') });
    } catch (err) {
      setMsg({ severity: 'error', text: errorMessage(err) });
    }
  };

  return (
    <Section title={t('admin.ntfy.title')} description={t('admin.ntfy.description')}>
      <Stack component="form" spacing={2} onSubmit={submit} sx={{ maxWidth: 560 }}>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(form.enabled)}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
          }
          label={t('admin.ntfy.enabled')}
        />
        <TextField
          label={t('admin.ntfy.url')}
          placeholder="https://ntfy.example.com"
          value={form.url ?? ''}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          helperText={t('admin.ntfy.urlHint')}
        />
        <TextField
          label={t('admin.ntfy.topic')}
          placeholder="my-pets-7f3a"
          value={form.topic ?? ''}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          helperText={t('admin.ntfy.topicHint')}
        />
        <TextField
          type="password"
          autoComplete="off"
          label={t('admin.ntfy.token')}
          value={form.token ?? ''}
          placeholder={settings.ntfy.hasToken ? '••••••••' : ''}
          onChange={(e) => setForm({ ...form, token: e.target.value })}
          helperText={
            settings.ntfy.hasToken ? t('admin.ntfy.tokenStored') : t('admin.ntfy.tokenHint')
          }
        />
        <TextField
          select
          label={t('admin.ntfy.language')}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          <MenuItem value="">{t('admin.ntfy.languageDefault')}</MenuItem>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="de">Deutsch</MenuItem>
        </TextField>
        {msg && <Alert severity={msg.severity}>{msg.text}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">
            {t('common.save')}
          </Button>
          <Button onClick={test} disabled={!settings.ntfy.topic}>
            {t('admin.ntfy.test')}
          </Button>
        </Stack>
      </Stack>
    </Section>
  );
}

function UsersSection() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: () => get('/admin/users') });
  const [deleting, setDeleting] = useState(null);
  const changeRole = useMutation({
    mutationFn: ({ id, role }) => patch(`/admin/users/${id}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <Section title={t('admin.users.title')}>
      {changeRole.isError && <Alert severity="error">{errorMessage(changeRole.error)}</Alert>}
      <QueryState query={users}>
        {(list) => (
          <List disablePadding>
            {list.map((u) => (
              <ListItem
                key={u.id}
                disableGutters
                divider
                secondaryAction={
                  u.id !== me.id && (
                    <Tooltip title={t('common.delete')}>
                      <IconButton
                        edge="end"
                        aria-label={t('common.delete')}
                        onClick={() => setDeleting(u)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )
                }
              >
                <ListItemText
                  primary={u.display_name}
                  secondary={`${u.email} · ${t('admin.users.since', { date: formatDate(u.created_at) })}`}
                  sx={{ pr: 2, minWidth: 0 }}
                  slotProps={{ secondary: { sx: { overflowWrap: 'anywhere' } } }}
                />
                <TextField
                  select
                  size="small"
                  value={u.role}
                  disabled={u.id === me.id}
                  onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                  sx={{ mr: 6, minWidth: 110 }}
                  slotProps={{ htmlInput: { 'aria-label': t('admin.users.role') } }}
                >
                  <MenuItem value="user">{t('admin.users.roles.user')}</MenuItem>
                  <MenuItem value="admin">{t('admin.users.roles.admin')}</MenuItem>
                </TextField>
              </ListItem>
            ))}
          </List>
        )}
      </QueryState>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.users.deleteTitle', { name: deleting?.display_name })}
        message={t('admin.users.deleteText')}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await del(`/admin/users/${deleting.id}`);
          queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        }}
      />
    </Section>
  );
}

const CATALOG = {
  foods: (t) => [
    { name: 'name', label: t('common.name'), required: true },
    { name: 'brand', label: t('admin.catalog.brand'), half: true },
    { name: 'kcal_per_100g', label: t('admin.catalog.kcal'), type: 'number', half: true },
    { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ],
  medications: (t) => [
    { name: 'name', label: t('common.name'), required: true },
    { name: 'active_ingredient', label: t('admin.catalog.ingredient') },
    { name: 'default_dose', label: t('admin.catalog.defaultDose'), type: 'number', half: true },
    { name: 'unit', label: t('common.unit'), half: true },
    { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ],
};

function CatalogSection() {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState('foods');
  const items = useCatalog(kind);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['catalog', kind] });
  const fields = CATALOG[kind](t);

  const columns = [
    { field: 'name', headerName: t('common.name'), flex: 2, minWidth: 160 },
    ...(kind === 'foods'
      ? [
          { field: 'brand', headerName: t('admin.catalog.brand'), flex: 1, minWidth: 120 },
          {
            field: 'kcal_per_100g',
            headerName: t('admin.catalog.kcal'),
            type: 'number',
            width: 130,
            valueFormatter: (v) => formatNumber(v),
          },
        ]
      : [
          {
            field: 'active_ingredient',
            headerName: t('admin.catalog.ingredient'),
            flex: 1,
            minWidth: 120,
          },
          {
            field: 'default_dose',
            headerName: t('admin.catalog.defaultDose'),
            width: 130,
            valueGetter: (_v, row) =>
              row.default_dose != null ? `${formatNumber(row.default_dose)} ${row.unit ?? ''}` : '',
          },
        ]),
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <>
          <IconButton size="small" aria-label={t('common.edit')} onClick={() => setEditing(row)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label={t('common.delete')} onClick={() => setDeleting(row)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Section title={t('admin.catalog.title')} description={t('admin.catalog.description')}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Tabs value={kind} onChange={(_e, v) => setKind(v)} sx={{ flex: 1 }}>
          <Tab value="foods" label={t('admin.catalog.foods')} />
          <Tab value="medications" label={t('admin.catalog.medications')} />
        </Tabs>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
          {t('common.add')}
        </Button>
      </Stack>
      <Box sx={{ width: '100%', minWidth: 0 }}>
        <DataGrid
          autoHeight
          rows={items.data ?? []}
          loading={items.isPending}
          columns={columns}
          disableRowSelectionOnClick
          density="compact"
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          localeText={
            i18n.resolvedLanguage === 'de'
              ? deDE.components.MuiDataGrid.defaultProps.localeText
              : undefined
          }
          sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}
        />
      </Box>
      {editing && (
        <FormDialog
          open
          title={editing === 'new' ? t('common.add') : t('common.edit')}
          fields={fields}
          initialValues={editing === 'new' ? {} : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing === 'new') await post(`/catalog/${kind}`, values);
            else await patch(`/catalog/${kind}/${editing.id}`, values);
            invalidate();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('common.confirmDeleteTitle')}
        message={t('admin.catalog.deleteText')}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await del(`/catalog/${kind}/${deleting.id}`);
          invalidate();
        }}
      />
    </Section>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => get('/admin/settings'),
  });
  const errorMessage = useErrorMessage();
  const [error, setError] = useState(null);
  const save = async (values) => {
    setError(null);
    try {
      const updated = await put('/admin/settings', values);
      queryClient.setQueryData(['admin', 'settings'], updated);
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  return (
    <>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(error)}
        </Alert>
      )}
      <QueryState query={settings}>
        {(s) => (
          <Stack spacing={2.5}>
            <AccessSection settings={s} save={(v) => save(v).catch(() => {})} />
            <NtfySection settings={s} save={save} />
            <UsersSection />
            <CatalogSection />
          </Stack>
        )}
      </QueryState>
    </>
  );
}
