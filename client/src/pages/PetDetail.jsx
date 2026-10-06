import { lazy, Suspense } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { usePet } from '../api/hooks.js';
import { formatAge } from '../lib/format.js';
import QueryState from '../components/QueryState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PetAvatar from '../components/PetAvatar.jsx';
import Overview from './pet/Overview.jsx';
import { HealthTab, AppointmentsTab, FeedingTab, PreventionTab } from './pet/tabs.jsx';
import MedicationsTab from './pet/MedicationsTab.jsx';
import IllnessesTab from './pet/IllnessesTab.jsx';

const IllnessDetail = lazy(() => import('./pet/IllnessDetail.jsx'));

const TABS = [
  'overview',
  'health',
  'medications',
  'appointments',
  'feeding',
  'prevention',
  'illnesses',
];

export default function PetDetail() {
  const { t } = useTranslation();
  const { id, tab = 'overview', itemId } = useParams();
  const navigate = useNavigate();
  const query = usePet(id);
  const queryClient = useQueryClient();
  const current = TABS.includes(tab) ? tab : 'overview';

  return (
    <QueryState query={query}>
      {(pet) => (
        <>
          <PageHeader
            leading={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title={t('common.back')}>
                  <IconButton component={RouterLink} to="/pets" aria-label={t('common.back')}>
                    <ArrowBackIcon />
                  </IconButton>
                </Tooltip>
                <PetAvatar pet={pet} size={56} />
              </Box>
            }
            title={pet.name}
            subtitle={[t(`species.${pet.species}`), pet.breed, formatAge(pet.birth_date, t)]
              .filter(Boolean)
              .join(' · ')}
          />
          {!itemId && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mx: { xs: -2, sm: 0 } }}>
              <Tabs
                value={current}
                onChange={(_e, value) =>
                  navigate(value === 'overview' ? `/pets/${id}` : `/pets/${id}/${value}`)
                }
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                aria-label={t('pets.sections')}
              >
                {TABS.map((key) => (
                  <Tab key={key} value={key} label={t(`pets.tabs.${key}`)} />
                ))}
              </Tabs>
            </Box>
          )}
          {itemId && current === 'illnesses' ? (
            <Suspense fallback={<CircularProgress />}>
              <IllnessDetail pet={pet} illnessId={itemId} />
            </Suspense>
          ) : (
            <>
              {current === 'overview' && (
                <Overview pet={pet} onChanged={() => queryClient.invalidateQueries()} />
              )}
              {current === 'health' && <HealthTab petId={pet.id} />}
              {current === 'medications' && <MedicationsTab petId={pet.id} />}
              {current === 'appointments' && <AppointmentsTab petId={pet.id} />}
              {current === 'feeding' && <FeedingTab petId={pet.id} />}
              {current === 'prevention' && <PreventionTab petId={pet.id} />}
              {current === 'illnesses' && <IllnessesTab petId={pet.id} />}
            </>
          )}
        </>
      )}
    </QueryState>
  );
}
