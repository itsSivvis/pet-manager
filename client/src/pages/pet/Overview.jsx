import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { api, patch, del } from '../../api/client.js';
import { usePetResource } from '../../api/hooks.js';
import { formatDate, formatAge } from '../../lib/format.js';
import { useErrorMessage } from '../../lib/useErrorMessage.js';
import PetAvatar from '../../components/PetAvatar.jsx';
import FormDialog from '../../components/FormDialog.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import WeightChart from '../../components/WeightChart.jsx';
import { petFields } from './petFields.js';

export default function Overview({ pet, onChanged }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const fileInput = useRef(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const health = usePetResource(pet.id, 'health');

  async function uploadPhoto(file) {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.append('photo', file);
    try {
      await api(`/pets/${pet.id}/photo`, { method: 'POST', body: form });
      onChanged();
    } catch (err) {
      setError(err);
    }
  }

  const facts = [
    ['pets.fields.species', t(`species.${pet.species}`)],
    ['pets.fields.breed', pet.breed],
    ['pets.fields.sex', pet.sex && t(`pets.sex.${pet.sex}`)],
    ['pets.fields.neutered', pet.neutered ? t('common.yes') : t('common.no')],
    [
      'pets.fields.birthDate',
      pet.birth_date && `${formatDate(pet.birth_date)} (${formatAge(pet.birth_date, t)})`,
    ],
    ['pets.fields.color', pet.color],
    ['pets.fields.microchip', pet.microchip],
  ].filter(([, v]) => v);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
        alignItems: 'start',
      }}
    >
      <Card>
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <PetAvatar pet={pet} size={128} />
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => uploadPhoto(e.target.files?.[0])}
            />
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<PhotoCameraOutlinedIcon />}
                onClick={() => fileInput.current?.click()}
              >
                {pet.photo ? t('pets.changePhoto') : t('pets.addPhoto')}
              </Button>
              {pet.photo && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => del(`/pets/${pet.id}/photo`).then(onChanged)}
                >
                  {t('pets.removePhoto')}
                </Button>
              )}
            </Stack>
            {error && <Alert severity="error">{errorMessage(error)}</Alert>}
          </Stack>
          <Box
            component="dl"
            sx={{
              mt: 2,
              mb: 0,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 2,
              rowGap: 1,
            }}
          >
            {facts.map(([key, value]) => (
              <Box key={key} sx={{ display: 'contents' }}>
                <Typography component="dt" variant="body2" color="text.secondary">
                  {t(key)}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
          {pet.notes && (
            <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {pet.notes}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => setEditing(true)}
            >
              {t('common.edit')}
            </Button>
            <Button
              color="inherit"
              startIcon={pet.archived ? <UnarchiveOutlinedIcon /> : <ArchiveOutlinedIcon />}
              onClick={() => patch(`/pets/${pet.id}`, { archived: !pet.archived }).then(onChanged)}
            >
              {pet.archived ? t('pets.unarchive') : t('pets.archive')}
            </Button>
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setDeleting(true)}
            >
              {t('common.delete')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            {t('health.weightChart')}
          </Typography>
          {health.list.data && health.list.data.filter((e) => e.weight_kg != null).length >= 2 ? (
            <WeightChart entries={health.list.data} height={260} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('health.weightChartEmpty')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {editing && (
        <FormDialog
          open
          title={t('pets.edit')}
          fields={petFields(t)}
          initialValues={pet}
          onClose={() => setEditing(false)}
          onSubmit={async (values) => {
            await patch(`/pets/${pet.id}`, values);
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting}
        title={t('pets.deleteTitle', { name: pet.name })}
        message={t('pets.deleteText')}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          await del(`/pets/${pet.id}`);
          onChanged();
          navigate('/pets');
        }}
      />
    </Box>
  );
}
