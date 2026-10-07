import { Link as RouterLink } from 'react-router';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { formatDate, todayIso } from '../../lib/format.js';
import ResourceTab from './ResourceTab.jsx';
import { ILLNESS_STATUS_COLOR, illnessFields } from './illnessFields.js';

export default function IllnessesTab({ petId }) {
  const { t } = useTranslation();
  return (
    <ResourceTab
      petId={petId}
      resource="illnesses"
      title={t('illness.title')}
      addLabel={t('illness.add')}
      emptyEmoji="🌿"
      emptyText={t('illness.empty')}
      initialValues={{ status: 'active', started_on: todayIso() }}
      fields={illnessFields(t)}
      renderItem={(i) => (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            <Typography variant="subtitle1">{i.title}</Typography>
            <Chip
              size="small"
              color={ILLNESS_STATUS_COLOR[i.status]}
              variant="outlined"
              label={t(`illness.status.${i.status}`)}
            />
          </Stack>
          <Typography variant="body2" color="textSecondary">
            {formatDate(i.started_on)}
            {i.ended_on && ` – ${formatDate(i.ended_on)}`}
          </Typography>
          {i.diagnosis && <Typography variant="body2">{i.diagnosis}</Typography>}
          <Button
            component={RouterLink}
            to={`/pets/${petId}/illnesses/${i.id}`}
            size="small"
            sx={{ mt: 1, ml: -1 }}
          >
            {t('illness.openTimeline')}
          </Button>
        </>
      )}
    />
  );
}
