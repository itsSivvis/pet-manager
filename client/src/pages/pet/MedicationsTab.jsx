import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import { useTranslation } from 'react-i18next';
import { get, post, del } from '../../api/client.js';
import { useCatalog } from '../../api/hooks.js';
import { formatDate, formatDateTime, formatNumber, todayIso } from '../../lib/format.js';
import ResourceTab from './ResourceTab.jsx';

function Doses({ petId, med }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const key = ['pet', String(petId), 'medications', med.id, 'doses'];
  const doses = useQuery({
    queryKey: key,
    queryFn: () => get(`/pets/${petId}/medications/${med.id}/doses?limit=10`),
  });
  const undo = useMutation({
    mutationFn: (doseId) => del(`/pets/${petId}/medications/${med.id}/doses/${doseId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pet', String(petId)] }),
  });
  if (!doses.data?.length) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ py: 1 }}>
        {t('medications.noDoses')}
      </Typography>
    );
  }
  return (
    <List dense disablePadding>
      {doses.data.map((d) => (
        <ListItem
          key={d.id}
          disableGutters
          secondaryAction={
            <Tooltip title={t('medications.undoDose')}>
              <IconButton
                size="small"
                onClick={() => undo.mutate(d.id)}
                aria-label={t('medications.undoDose')}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          <ListItemText
            primary={formatDateTime(d.given_at)}
            secondary={[
              d.amount != null && `${formatNumber(d.amount)} ${med.unit ?? ''}`,
              d.given_by_name,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </ListItem>
      ))}
    </List>
  );
}

function MedicationItem({ petId, med }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const give = useMutation({
    mutationFn: () => post(`/pets/${petId}/medications/${med.id}/doses`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', String(petId)] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(true);
    },
  });
  const ended = med.end_date && med.end_date < todayIso();
  const low =
    med.stock != null && med.low_stock_threshold != null && med.stock <= med.low_stock_threshold;

  return (
    <Box sx={{ opacity: ended ? 0.75 : 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        <Typography variant="subtitle1">{med.name}</Typography>
        {ended && <Chip size="small" variant="outlined" label={t('medications.ended')} />}
        {!med.reminders_enabled && (
          <Tooltip title={t('medications.remindersOff')}>
            <NotificationsOffOutlinedIcon
              fontSize="small"
              color="action"
              aria-label={t('medications.remindersOff')}
            />
          </Tooltip>
        )}
      </Stack>
      <Typography variant="body2">
        {[
          med.dose != null && `${formatNumber(med.dose)} ${med.unit ?? ''}`,
          med.interval_days === 1
            ? t('medications.daily')
            : t('medications.everyNDays', { count: med.interval_days }),
        ]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
      <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
        {med.times.map((time) => (
          <Chip key={time} size="small" variant="outlined" label={time} />
        ))}
        {med.stock != null && (
          <Chip
            size="small"
            color={low ? 'warning' : 'default'}
            variant={low ? 'filled' : 'outlined'}
            label={t('medications.stockLeft', {
              amount: formatNumber(med.stock),
              unit: med.unit ?? '',
            })}
          />
        )}
      </Stack>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        {t('medications.period', { start: formatDate(med.start_date) })}
        {med.end_date && ` – ${formatDate(med.end_date)}`}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={() => give.mutate()}
          disabled={give.isPending}
        >
          {t('medications.giveNow')}
        </Button>
        <Button size="small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t('medications.hideHistory') : t('medications.showHistory')}
        </Button>
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Doses petId={petId} med={med} />
      </Collapse>
    </Box>
  );
}

export default function MedicationsTab({ petId }) {
  const { t } = useTranslation();
  const catalog = useCatalog('medications');
  return (
    <ResourceTab
      petId={petId}
      resource="medications"
      title={t('medications.title')}
      addLabel={t('medications.add')}
      emptyEmoji="💊"
      emptyText={t('medications.empty')}
      initialValues={{
        start_date: todayIso(),
        interval_days: 1,
        times: ['08:00'],
        reminders_enabled: true,
      }}
      fields={[
        { name: 'catalog_id', type: 'hidden' },
        {
          name: 'name',
          label: t('common.name'),
          type: 'autocomplete',
          required: true,
          options: (catalog.data ?? []).map((m) => ({ ...m, label: m.name })),
          onPick: (m, setValues) =>
            setValues((v) => ({
              ...v,
              catalog_id: m.id,
              name: m.name,
              dose: m.default_dose ?? v.dose,
              unit: m.unit ?? v.unit,
            })),
          helperText: t('medications.catalogHint'),
        },
        { name: 'dose', label: t('medications.dose'), type: 'number', half: true, min: 0 },
        {
          name: 'unit',
          label: t('common.unit'),
          half: true,
          helperText: t('medications.unitHint'),
        },
        { name: 'times', label: t('medications.times'), type: 'times' },
        {
          name: 'interval_days',
          label: t('medications.intervalDays'),
          type: 'number',
          step: 1,
          min: 1,
          required: true,
          half: true,
          helperText: t('medications.intervalHint'),
        },
        {
          name: 'reminders_enabled',
          label: t('medications.reminders'),
          type: 'switch',
          half: true,
        },
        {
          name: 'start_date',
          label: t('medications.startDate'),
          type: 'date',
          required: true,
          half: true,
        },
        { name: 'end_date', label: t('medications.endDate'), type: 'date', half: true },
        { name: 'stock', label: t('medications.stock'), type: 'number', half: true, min: 0 },
        {
          name: 'low_stock_threshold',
          label: t('medications.lowStockThreshold'),
          type: 'number',
          half: true,
          min: 0,
        },
        { name: 'notes', label: t('common.notes'), type: 'textarea' },
      ]}
      renderItem={(med) => <MedicationItem petId={petId} med={med} />}
    />
  );
}
