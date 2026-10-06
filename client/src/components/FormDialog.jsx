import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../lib/useErrorMessage.js';
import { toDateTimeLocal } from '../lib/format.js';

/**
 * Generic form dialog driven by a field list:
 *   { name, label, type: text|textarea|number|date|datetime|select|switch|times|autocomplete|hidden,
 *     required, options: [{ value, label }], helperText, step, half, onPick }
 * Values are normalized before `onSubmit` (empty numbers -> null, datetime -> ISO).
 */
export default function FormDialog({
  open,
  title,
  fields,
  initialValues = {},
  onSubmit,
  onClose,
  submitLabel,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const errorMessage = useErrorMessage();
  const [values, setValues] = useState(() => prepare(fields, initialValues));
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const missing = fields.filter(
      (f) => f.required && (values[f.name] === '' || values[f.name] == null),
    );
    if (missing.length) {
      setFieldErrors(Object.fromEntries(missing.map((f) => [f.name, t('form.required')])));
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit(normalize(fields, values));
      onClose();
    } catch (err) {
      setError(err);
      if (Array.isArray(err.details)) {
        setFieldErrors(
          Object.fromEntries(err.details.map((d) => [d.path.split('.')[0], t('form.invalid')])),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'contents' }}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage(error)}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {fields
              .filter((f) => f.type !== 'hidden')
              .map((field) => (
                <Box key={field.name} sx={{ gridColumn: field.half ? 'auto' : '1 / -1' }}>
                  <Field
                    field={field}
                    value={values[field.name]}
                    error={fieldErrors[field.name]}
                    onChange={(v) => setValue(field.name, v)}
                    setValues={setValues}
                  />
                </Box>
              ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {submitLabel ?? t('common.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function Field({ field, value, error, onChange, setValues }) {
  const { t } = useTranslation();
  const common = {
    id: `field-${field.name}`,
    label: field.label,
    required: field.required,
    error: Boolean(error),
    helperText: error || field.helperText,
    fullWidth: true,
  };

  switch (field.type) {
    case 'switch':
      return (
        <FormControlLabel
          control={<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />}
          label={field.label}
        />
      );
    case 'select':
      return (
        <TextField
          {...common}
          select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {!field.required && (
            <MenuItem value="">
              <em>{t('form.none')}</em>
            </MenuItem>
          )}
          {field.options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      );
    case 'textarea':
      return (
        <TextField
          {...common}
          multiline
          minRows={3}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <TextField
          {...common}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          slotProps={{
            htmlInput: {
              step: field.step ?? 'any',
              min: field.min,
              max: field.max,
              inputMode: 'decimal',
            },
          }}
        />
      );
    case 'date':
    case 'datetime':
      return (
        <TextField
          {...common}
          type={field.type === 'date' ? 'date' : 'datetime-local'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    case 'times':
      return <TimesField field={field} value={value ?? []} onChange={onChange} />;
    case 'autocomplete':
      return (
        <Autocomplete
          freeSolo
          options={field.options ?? []}
          getOptionLabel={(o) => (typeof o === 'string' ? o : o.label)}
          inputValue={value ?? ''}
          onInputChange={(_e, v) => onChange(v)}
          onChange={(_e, option) => {
            if (option && typeof option === 'object') field.onPick?.(option, setValues);
          }}
          renderInput={(params) => <TextField {...params} {...common} />}
        />
      );
    default:
      return (
        <TextField {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
  }
}

/** Editor for a list of times of day ('HH:MM'). */
function TimesField({ field, value, onChange }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('08:00');
  const add = () => {
    if (/^\d{2}:\d{2}$/.test(draft) && !value.includes(draft)) onChange([...value, draft].sort());
  };
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {field.label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <TextField
          size="small"
          type="time"
          label={t('form.time')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <IconButton onClick={add} aria-label={t('form.addTime')} color="primary">
          <AddIcon />
        </IconButton>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {value.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('form.noTimes')}
          </Typography>
        )}
        {value.map((time) => (
          <Chip
            key={time}
            label={time}
            onDelete={() => onChange(value.filter((x) => x !== time))}
          />
        ))}
      </Box>
      {field.helperText && (
        <Typography variant="caption" color="text.secondary">
          {field.helperText}
        </Typography>
      )}
    </Box>
  );
}

function prepare(fields, initial) {
  const out = {};
  for (const f of fields) {
    let v = initial[f.name];
    if (f.type === 'datetime') v = v ? toDateTimeLocal(v) : (f.default ?? '');
    else if (f.type === 'times') v = v ?? f.default ?? [];
    else if (f.type === 'switch') v = v ?? f.default ?? false;
    else v = v ?? f.default ?? '';
    out[f.name] = v;
  }
  return out;
}

function normalize(fields, values) {
  const out = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.readOnly) continue;
    if (f.type === 'number') out[f.name] = v === '' || v == null ? null : Number(v);
    else if (f.type === 'datetime') out[f.name] = v ? new Date(v).toISOString() : null;
    else if ((f.type === 'select' || f.type === 'hidden') && v === '') out[f.name] = null;
    else out[f.name] = v;
  }
  return out;
}
