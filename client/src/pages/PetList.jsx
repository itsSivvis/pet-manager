import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { usePets } from '../api/hooks.js';
import { post } from '../api/client.js';
import { formatAge, formatNumber } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import QueryState from '../components/QueryState.jsx';
import PetAvatar from '../components/PetAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FormDialog from '../components/FormDialog.jsx';
import { petFields } from './pet/petFields.js';

export default function PetList() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [archived, setArchived] = useState(false);
  const query = usePets(archived);
  const creating = params.get('new') === '1';
  const createdId = useRef(null);

  const addButton = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setParams({ new: '1' })}>
      {t('pets.add')}
    </Button>
  );

  return (
    <>
      <PageHeader title={t('pets.title')} actions={addButton} />
      <FormControlLabel
        control={<Switch checked={archived} onChange={(e) => setArchived(e.target.checked)} />}
        label={t('pets.showArchived')}
        sx={{ mb: 2 }}
      />
      <QueryState query={query}>
        {(pets) =>
          pets.length === 0 ? (
            <Card>
              <EmptyState
                emoji={archived ? '📦' : '🐾'}
                title={archived ? t('pets.noArchived') : t('pets.emptyTitle')}
                description={archived ? undefined : t('pets.emptyText')}
                action={archived ? undefined : addButton}
              />
            </Card>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              }}
            >
              {pets.map((pet, i) => (
                <Card
                  key={pet.id}
                  sx={{
                    animationDelay: `${i * 50}ms`,
                    borderTop: theme.custom.playful
                      ? `6px solid ${theme.custom.species[pet.species]}`
                      : undefined,
                  }}
                >
                  <CardActionArea
                    component={RouterLink}
                    to={`/pets/${pet.id}`}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <PetAvatar pet={pet} size={64} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="h6" component="h2" noWrap>
                            {pet.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {[t(`species.${pet.species}`), pet.breed, formatAge(pet.birth_date, t)]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}
                          >
                            {pet.last_weight_kg != null && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${formatNumber(pet.last_weight_kg)} kg`}
                              />
                            )}
                            {pet.open_illnesses > 0 && (
                              <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                label={t('pets.openIllnesses', { count: pet.open_illnesses })}
                              />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )
        }
      </QueryState>
      {creating && (
        <FormDialog
          open
          title={t('pets.add')}
          fields={petFields(t)}
          onClose={() => {
            // Navigate once, after the dialog closed: to the new pet or back to the list.
            if (createdId.current) navigate(`/pets/${createdId.current}`, { replace: true });
            else setParams({});
            createdId.current = null;
          }}
          onSubmit={async (values) => {
            const pet = await post('/pets', values);
            await queryClient.invalidateQueries();
            createdId.current = pet.id;
          }}
        />
      )}
    </>
  );
}
