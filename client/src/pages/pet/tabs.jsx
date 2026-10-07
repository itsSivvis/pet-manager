import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useCatalog } from '../../api/hooks.js';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelativeDays,
  todayIso,
} from '../../lib/format.js';
import { preventionDueDate, preventionStatus } from '../../lib/schedule.js';
import WeightChart from '../../components/WeightChart.jsx';
import ResourceTab from './ResourceTab.jsx';

const HEALTH_TYPES = ['weight', 'vet_visit', 'vaccination', 'observation', 'other'];
const PREVENTION_TYPES = ['deworming', 'flea_tick', 'vaccination', 'dental', 'grooming', 'other'];

function Notes({ children }) {
  if (!children) return null;
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
    >
      {children}
    </Typography>
  );
}

export function HealthTab({ petId }) {
  const { t } = useTranslation();
  return (
    <ResourceTab
      petId={petId}
      resource="health"
      title={t('health.title')}
      addLabel={t('health.add')}
      emptyEmoji="🩺"
      emptyText={t('health.empty')}
      initialValues={{ date: todayIso(), type: 'weight' }}
      fields={[
        { name: 'date', label: t('common.date'), type: 'date', required: true, half: true },
        {
          name: 'type',
          label: t('common.type'),
          type: 'select',
          required: true,
          half: true,
          options: HEALTH_TYPES.map((v) => ({ value: v, label: t(`health.types.${v}`) })),
        },
        { name: 'title', label: t('common.title') },
        { name: 'weight_kg', label: t('health.weightKg'), type: 'number', step: 0.01, min: 0 },
        { name: 'notes', label: t('common.notes'), type: 'textarea' },
      ]}
      renderAbove={(items) =>
        items.filter((e) => e.weight_kg != null).length >= 2 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" component="h3" gutterBottom>
                {t('health.weightChart')}
              </Typography>
              <WeightChart entries={items} />
            </CardContent>
          </Card>
        )
      }
      renderItem={(e) => (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            <Chip size="small" label={t(`health.types.${e.type}`)} />
            <Typography variant="body2" color="text.secondary">
              {formatDate(e.date)}
            </Typography>
          </Stack>
          <Typography variant="subtitle1" sx={{ mt: 0.5 }}>
            {e.title ||
              (e.weight_kg != null
                ? `${formatNumber(e.weight_kg)} kg`
                : t(`health.types.${e.type}`))}
          </Typography>
          {e.title && e.weight_kg != null && (
            <Typography variant="body2">{formatNumber(e.weight_kg)} kg</Typography>
          )}
          <Notes>{e.notes}</Notes>
        </>
      )}
    />
  );
}

export function AppointmentsTab({ petId }) {
  const { t } = useTranslation();
  const reminders = { 30: '30m', 60: '1h', 120: '2h', 1440: '1d', 2880: '2d' };
  return (
    <ResourceTab
      petId={petId}
      resource="appointments"
      title={t('appointments.title')}
      addLabel={t('appointments.add')}
      emptyEmoji="📅"
      emptyText={t('appointments.empty')}
      initialValues={() => ({
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
        remind_minutes_before: 60,
      })}
      fields={[
        { name: 'title', label: t('common.title'), required: true },
        {
          name: 'starts_at',
          label: t('appointments.startsAt'),
          type: 'datetime',
          required: true,
          half: true,
        },
        {
          name: 'remind_minutes_before',
          label: t('appointments.reminder'),
          type: 'select',
          half: true,
          options: Object.entries(reminders).map(([minutes, key]) => ({
            value: Number(minutes),
            label: t(`appointments.remind.${key}`),
          })),
        },
        { name: 'location', label: t('appointments.location') },
        { name: 'done', label: t('appointments.done'), type: 'switch' },
        { name: 'notes', label: t('common.notes'), type: 'textarea' },
      ]}
      renderItem={(a) => (
        <Box sx={{ opacity: a.done ? 0.75 : 1 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(a.starts_at)}
            </Typography>
            {a.done && (
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={t('appointments.done')}
              />
            )}
          </Stack>
          <Typography variant="subtitle1" sx={{ textDecoration: a.done ? 'line-through' : 'none' }}>
            {a.title}
          </Typography>
          {a.location && <Typography variant="body2">{a.location}</Typography>}
          <Notes>{a.notes}</Notes>
        </Box>
      )}
    />
  );
}

export function FeedingTab({ petId }) {
  const { t } = useTranslation();
  const foods = useCatalog('foods');
  return (
    <ResourceTab
      petId={petId}
      resource="feeding"
      title={t('feeding.title')}
      addLabel={t('feeding.add')}
      emptyEmoji="🥣"
      emptyText={t('feeding.empty')}
      fields={[
        { name: 'food_id', type: 'hidden' },
        {
          name: 'food_name',
          label: t('feeding.food'),
          type: 'autocomplete',
          required: true,
          options: (foods.data ?? []).map((f) => ({
            ...f,
            label: f.brand ? `${f.name} (${f.brand})` : f.name,
          })),
          onPick: (food, setValues) =>
            setValues((v) => ({ ...v, food_id: food.id, food_name: food.name })),
          helperText: t('feeding.catalogHint'),
        },
        { name: 'amount', label: t('common.amount'), type: 'number', half: true, min: 0 },
        { name: 'unit', label: t('common.unit'), half: true, helperText: t('feeding.unitHint') },
        { name: 'times', label: t('feeding.times'), type: 'times' },
        { name: 'notes', label: t('common.notes'), type: 'textarea' },
      ]}
      renderItem={(f) => (
        <>
          <Typography variant="subtitle1">{f.food_name}</Typography>
          {f.amount != null && (
            <Typography variant="body2">
              {formatNumber(f.amount)} {f.unit}
              {f.times.length > 0 && ` · ${t('feeding.perMeal')}`}
            </Typography>
          )}
          <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {f.times.map((time) => (
              <Chip key={time} size="small" variant="outlined" label={time} />
            ))}
          </Stack>
          <Notes>{f.notes}</Notes>
        </>
      )}
    />
  );
}

const STATUS_COLOR = { overdue: 'error', due_soon: 'warning', ok: 'success', unknown: 'default' };

export function PreventionTab({ petId }) {
  const { t } = useTranslation();
  const today = todayIso();
  return (
    <ResourceTab
      petId={petId}
      resource="prevention"
      title={t('prevention.title')}
      addLabel={t('prevention.add')}
      emptyEmoji="🛡️"
      emptyText={t('prevention.empty')}
      initialValues={{ type: 'deworming', last_date: today }}
      fields={[
        {
          name: 'type',
          label: t('common.type'),
          type: 'select',
          required: true,
          options: PREVENTION_TYPES.map((v) => ({ value: v, label: t(`prevention.types.${v}`) })),
        },
        { name: 'product', label: t('prevention.product') },
        { name: 'last_date', label: t('prevention.lastDate'), type: 'date', half: true },
        {
          name: 'interval_days',
          label: t('prevention.intervalDays'),
          type: 'number',
          step: 1,
          min: 1,
          half: true,
        },
        { name: 'notes', label: t('common.notes'), type: 'textarea' },
      ]}
      itemActions={(item, res) => (
        <Chip
          size="small"
          clickable
          color="primary"
          variant="outlined"
          label={t('prevention.doneToday')}
          onClick={() => res.update.mutate({ id: item.id, last_date: today })}
          sx={{ mr: 0.5, alignSelf: 'center' }}
        />
      )}
      renderItem={(p) => {
        const due = preventionDueDate(p);
        const status = preventionStatus(p, today);
        return (
          <>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
            >
              <Typography variant="subtitle1">{t(`prevention.types.${p.type}`)}</Typography>
              <Chip
                size="small"
                color={STATUS_COLOR[status]}
                variant="outlined"
                label={t(`prevention.status.${status}`)}
              />
            </Stack>
            {p.product && <Typography variant="body2">{p.product}</Typography>}
            <Typography variant="body2" color="text.secondary">
              {p.last_date && t('prevention.lastOn', { date: formatDate(p.last_date) })}
              {due &&
                ` · ${t('prevention.dueOn', { date: formatDate(due), relative: formatRelativeDays(due) })}`}
            </Typography>
            <Notes>{p.notes}</Notes>
          </>
        );
      }}
    />
  );
}
