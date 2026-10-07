import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { useTranslation } from 'react-i18next';
import { get, post, patch, del } from '../../api/client.js';
import { formatDate, formatNumber, todayIso } from '../../lib/format.js';
import { useErrorMessage } from '../../lib/useErrorMessage.js';
import QueryState from '../../components/QueryState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormDialog from '../../components/FormDialog.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { duplicateEntry, latestEntry } from '../../components/illness/duplicateEntry.js';
import { buildIllnessPdf } from '../../components/illness/exportIllnessPdf.js';
import { ILLNESS_STATUS_COLOR, illnessFields } from './illnessFields.js';

const entryFields = (t) => [
  { name: 'date', label: t('common.date'), type: 'date', required: true, half: true },
  {
    name: 'severity',
    label: t('illness.severityScale'),
    type: 'number',
    step: 1,
    min: 1,
    max: 5,
    half: true,
  },
  { name: 'temperature_c', label: t('illness.temperature'), type: 'number', step: 0.1, half: true },
  { name: 'symptoms', label: t('illness.symptoms'), type: 'textarea' },
  { name: 'treatment', label: t('illness.treatment'), type: 'textarea' },
  { name: 'notes', label: t('common.notes'), type: 'textarea' },
];

function SeverityDots({ value }) {
  const { t } = useTranslation();
  if (value == null) return null;
  return (
    <Box
      sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}
      aria-label={t('illness.severityValue', { value })}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Box
          key={n}
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor:
              n <= value
                ? value >= 4
                  ? 'error.main'
                  : value >= 3
                    ? 'warning.main'
                    : 'success.main'
                : 'divider',
          }}
        />
      ))}
    </Box>
  );
}

function PdfPreview({ pet, illness, entries, onClose }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const fileName = `${pet.name}-${illness.title}`.replace(/[^\p{L}\p{N}-]+/gu, '_') + '.pdf';

  useEffect(() => {
    let objectUrl;
    buildIllnessPdf({ pet, illness, entries, t, accent: theme.palette.primary.main })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(setError);
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [pet, illness, entries, t, theme]);

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle>{t('pdf.preview')}</DialogTitle>
      <DialogContent
        dividers
        sx={{ p: 0, height: fullScreen ? 'auto' : '75vh', bgcolor: 'background.default' }}
      >
        {error && <Alert severity="error">{t('pdf.failed')}</Alert>}
        {url && (
          <Box
            component="iframe"
            src={url}
            title={t('pdf.preview')}
            sx={{ border: 0, width: '100%', height: '100%', minHeight: 400 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        <Button
          variant="contained"
          component="a"
          href={url ?? undefined}
          download={fileName}
          disabled={!url}
        >
          {t('pdf.download')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function IllnessDetail({ pet, illnessId }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const base = `/pets/${pet.id}/illnesses/${illnessId}`;
  const illness = useQuery({ queryKey: ['illness', illnessId], queryFn: () => get(base) });
  const entries = useQuery({
    queryKey: ['illness', illnessId, 'entries'],
    queryFn: () => get(`${base}/entries`),
  });
  const [form, setForm] = useState(null); // { initial, id? }
  const [editIllness, setEditIllness] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [preview, setPreview] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['illness', illnessId] });
    queryClient.invalidateQueries({ queryKey: ['pet', String(pet.id), 'illnesses'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const save = useMutation({
    mutationFn: ({ id, ...values }) =>
      id ? patch(`${base}/entries/${id}`, values) : post(`${base}/entries`, values),
    onSuccess: invalidate,
  });

  return (
    <QueryState query={illness}>
      {(ill) => (
        <Box>
          <Button
            component={RouterLink}
            to={`/pets/${pet.id}/illnesses`}
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            {t('illness.backToList')}
          </Button>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'flex-start' } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
                  >
                    <Typography variant="h5" component="h2">
                      {ill.title}
                    </Typography>
                    <Chip
                      size="small"
                      color={ILLNESS_STATUS_COLOR[ill.status]}
                      label={t(`illness.status.${ill.status}`)}
                    />
                  </Stack>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                    {formatDate(ill.started_on)}
                    {ill.ended_on && ` – ${formatDate(ill.ended_on)}`}
                  </Typography>
                  {ill.diagnosis && (
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {ill.diagnosis}
                    </Typography>
                  )}
                  {ill.notes && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
                    >
                      {ill.notes}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfOutlinedIcon />}
                    onClick={() => setPreview(true)}
                    disabled={!entries.data}
                  >
                    {t('pdf.export')}
                  </Button>
                  <Button startIcon={<EditOutlinedIcon />} onClick={() => setEditIllness(true)}>
                    {t('common.edit')}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
              {t('illness.entries')}
            </Typography>
            {entries.data?.length > 0 && (
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={() =>
                  setForm({ initial: duplicateEntry(latestEntry(entries.data), todayIso()) })
                }
              >
                {t('illness.duplicateLatest')}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setForm({ initial: { date: todayIso() } })}
            >
              {t('illness.addEntry')}
            </Button>
          </Stack>

          <QueryState query={entries}>
            {(list) =>
              list.length === 0 ? (
                <Card>
                  <EmptyState compact emoji="📝" description={t('illness.noEntries')} />
                </Card>
              ) : (
                <Box
                  component="ol"
                  sx={{ listStyle: 'none', p: 0, m: 0, position: 'relative' }}
                  aria-label={t('illness.entries')}
                >
                  {list.map((e, i) => (
                    <Box
                      component="li"
                      key={e.id}
                      sx={{
                        position: 'relative',
                        pl: 4,
                        pb: i === list.length - 1 ? 0 : 2,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 9,
                          top: 18,
                          bottom: 0,
                          width: 2,
                          bgcolor: i === list.length - 1 ? 'transparent' : 'divider',
                        },
                      }}
                    >
                      <Box
                        aria-hidden
                        sx={{
                          position: 'absolute',
                          left: 2,
                          top: 10,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: 'background.paper',
                          border: 4,
                          borderColor: theme.custom.playful
                            ? theme.custom.species[pet.species]
                            : 'primary.main',
                        }}
                      />
                      <Card sx={{ animationDelay: `${i * 40}ms` }}>
                        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
                            <Stack
                              direction="row"
                              sx={{
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 1,
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <Typography variant="subtitle1" component="h4">
                                {formatDate(e.date, {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </Typography>
                              <SeverityDots value={e.severity} />
                              {e.temperature_c != null && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${formatNumber(e.temperature_c, 1)} °C`}
                                />
                              )}
                            </Stack>
                            <Stack direction="row" sx={{ flexShrink: 0 }}>
                              <Tooltip title={t('illness.duplicate')}>
                                <IconButton
                                  size="small"
                                  aria-label={t('illness.duplicate')}
                                  onClick={() =>
                                    setForm({ initial: duplicateEntry(e, todayIso()) })
                                  }
                                >
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('common.edit')}>
                                <IconButton
                                  size="small"
                                  aria-label={t('common.edit')}
                                  onClick={() => setForm({ initial: e, id: e.id })}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('common.delete')}>
                                <IconButton
                                  size="small"
                                  aria-label={t('common.delete')}
                                  onClick={() => setDeleting(e)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                          {[
                            ['illness.symptoms', e.symptoms],
                            ['illness.treatment', e.treatment],
                            ['common.notes', e.notes],
                          ]
                            .filter(([, v]) => v)
                            .map(([key, value]) => (
                              <Typography
                                key={key}
                                variant="body2"
                                sx={{ mt: 0.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                              >
                                <Box
                                  component="span"
                                  sx={{ color: 'text.secondary', fontWeight: 600 }}
                                >
                                  {t(key)}:{' '}
                                </Box>
                                {value}
                              </Typography>
                            ))}
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )
            }
          </QueryState>

          {form && (
            <FormDialog
              open
              title={form.id ? t('illness.editEntry') : t('illness.addEntry')}
              fields={entryFields(t)}
              initialValues={form.initial}
              onClose={() => setForm(null)}
              onSubmit={(values) => save.mutateAsync({ id: form.id, ...values })}
            />
          )}
          {editIllness && (
            <FormDialog
              open
              title={t('illness.edit')}
              fields={illnessFields(t)}
              initialValues={ill}
              onClose={() => setEditIllness(false)}
              onSubmit={async (values) => {
                await patch(base, values);
                invalidate();
              }}
            />
          )}
          <ConfirmDialog
            open={Boolean(deleting)}
            title={t('common.confirmDeleteTitle')}
            message={t('common.confirmDeleteText')}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              await del(`${base}/entries/${deleting.id}`);
              invalidate();
            }}
          />
          {preview && entries.data && (
            <PdfPreview
              pet={pet}
              illness={ill}
              entries={entries.data}
              onClose={() => setPreview(false)}
            />
          )}
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Box>
      )}
    </QueryState>
  );
}
