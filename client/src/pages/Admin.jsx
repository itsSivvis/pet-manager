import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
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
import Section from '../components/Section.jsx';
import QueryState from '../components/QueryState.jsx';
import FormDialog from '../components/FormDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import InviteLink from '../components/InviteLink.jsx';

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
          <Typography variant="body2" color="textSecondary">
            {t('admin.access.allowRegistrationHint')}
          </Typography>
        </Box>
      </Stack>
    </Section>
  );
}

const invalidateAdmin = (queryClient) => {
  // Membership changes affect users, households and – if it was the own
  // account – every pet query, so refresh everything.
  queryClient.invalidateQueries();
};

function UsersSection() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: () => get('/admin/users') });
  const households = useQuery({
    queryKey: ['admin', 'households'],
    queryFn: () => get('/admin/households'),
  });
  const [deleting, setDeleting] = useState(null);
  const update = useMutation({
    mutationFn: ({ id, ...data }) => patch(`/admin/users/${id}`, data),
    onSuccess: () => invalidateAdmin(queryClient),
  });

  return (
    <Section title={t('admin.users.title')}>
      {update.isError && <Alert severity="error">{errorMessage(update.error)}</Alert>}
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
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  sx={{ width: '100%', pr: 6, alignItems: { md: 'center' } }}
                >
                  <ListItemText
                    primary={u.display_name}
                    secondary={`${u.email} · ${t('admin.users.since', { date: formatDate(u.created_at) })}`}
                    sx={{ minWidth: 0 }}
                    slotProps={{ secondary: { sx: { overflowWrap: 'anywhere' } } }}
                  />
                  <TextField
                    select
                    size="small"
                    value={households.data ? u.household_id : ''}
                    onChange={(e) => update.mutate({ id: u.id, household_id: e.target.value })}
                    sx={{ minWidth: 180 }}
                    slotProps={{ htmlInput: { 'aria-label': t('admin.users.household') } }}
                  >
                    {(households.data ?? []).map((h) => (
                      <MenuItem key={h.id} value={h.id}>
                        {h.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    value={u.role}
                    disabled={u.id === me.id}
                    onChange={(e) => update.mutate({ id: u.id, role: e.target.value })}
                    sx={{ minWidth: 110 }}
                    slotProps={{ htmlInput: { 'aria-label': t('admin.users.role') } }}
                  >
                    <MenuItem value="user">{t('admin.users.roles.user')}</MenuItem>
                    <MenuItem value="admin">{t('admin.users.roles.admin')}</MenuItem>
                  </TextField>
                </Stack>
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
          invalidateAdmin(queryClient);
        }}
      />
    </Section>
  );
}

function HouseholdsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const households = useQuery({
    queryKey: ['admin', 'households'],
    queryFn: () => get('/admin/households'),
  });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  return (
    <Section title={t('admin.households.title')} description={t('admin.households.description')}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(error)}
        </Alert>
      )}
      <QueryState query={households}>
        {(list) => (
          <List disablePadding>
            {list.map((h) => (
              <ListItem key={h.id} disableGutters divider sx={{ display: 'block' }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <ListItemText
                    primary={h.name}
                    secondary={t('admin.households.counts', {
                      members: h.member_count,
                      pets: h.pet_count,
                    })}
                    sx={{ minWidth: 0 }}
                  />
                  <Tooltip title={t('common.edit')}>
                    <IconButton aria-label={t('common.edit')} onClick={() => setEditing(h)}>
                      <EditOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={h.member_count > 0 ? t('admin.households.notEmpty') : t('common.delete')}
                  >
                    <span>
                      <IconButton
                        edge="end"
                        aria-label={t('common.delete')}
                        disabled={h.member_count > 0}
                        onClick={() => setDeleting(h)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
                {h.invite_code && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <InviteLink code={h.invite_code} label={t('household.invite.link')} />
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </QueryState>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ mt: 2 }}
        onClick={() => setEditing('new')}
      >
        {t('admin.households.add')}
      </Button>
      {editing && (
        <FormDialog
          open
          title={editing === 'new' ? t('admin.households.add') : t('common.edit')}
          fields={[{ name: 'name', label: t('household.name'), required: true }]}
          initialValues={editing === 'new' ? {} : editing}
          onClose={() => setEditing(null)}
          onSubmit={async ({ name }) => {
            if (editing === 'new') await post('/admin/households', { name });
            else await patch(`/admin/households/${editing.id}`, { name });
            invalidateAdmin(queryClient);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.households.deleteTitle', { name: deleting?.name })}
        message={t('admin.households.deleteText', { count: deleting?.pet_count ?? 0 })}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setError(null);
          try {
            await del(`/admin/households/${deleting.id}`);
          } catch (err) {
            setError(err);
          }
          invalidateAdmin(queryClient);
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
      return updated;
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
            <UsersSection />
            <HouseholdsSection />
            <CatalogSection />
          </Stack>
        )}
      </QueryState>
    </>
  );
}
