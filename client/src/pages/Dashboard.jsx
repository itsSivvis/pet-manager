import { Link as RouterLink } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HealingOutlinedIcon from '@mui/icons-material/HealingOutlined';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../api/hooks.js';
import { post } from '../api/client.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import {
  formatDateTime,
  formatNumber,
  formatRelativeDays,
  formatTime,
  formatShortDate,
  todayIso,
} from '../lib/format.js';
import QueryState from '../components/QueryState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PetAvatar from '../components/PetAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function Section({ icon, title, count, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>
            {icon}
          </Box>
          <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
            {title}
          </Typography>
          {count > 0 && <Chip size="small" label={count} />}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

/** "tomorrow, " / "yesterday, " prefix for doses that are not due today. */
function doseDay(at) {
  const day = todayIso(new Date(at));
  return day === todayIso() ? '' : `${formatRelativeDays(day)}, `;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const query = useDashboard();
  const queryClient = useQueryClient();
  const markGiven = useMutation({
    mutationFn: (dose) => post(`/pets/${dose.pet_id}/medications/${dose.medication_id}/doses`, {}),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const hour = new Date().getHours();
  const greeting = t(
    hour < 11
      ? 'dashboard.greetingMorning'
      : hour < 18
        ? 'dashboard.greetingDay'
        : 'dashboard.greetingEvening',
    {
      name: user?.anonymous ? '' : user?.display_name,
    },
  );

  return (
    <>
      <PageHeader title={greeting} subtitle={t('dashboard.subtitle')} />
      <QueryState query={query}>
        {(data) =>
          data.pets.length === 0 ? (
            <Card>
              <EmptyState
                emoji="🐣"
                title={t('dashboard.noPetsTitle')}
                description={t('dashboard.noPetsText')}
                action={
                  <Button variant="contained" component={RouterLink} to="/pets?new=1">
                    {t('pets.add')}
                  </Button>
                }
              />
            </Card>
          ) : (
            <Stack spacing={2.5}>
              <Box
                sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, mx: -0.5, px: 0.5 }}
                aria-label={t('nav.pets')}
              >
                {data.pets.map((pet) => (
                  <Box
                    key={pet.id}
                    component={RouterLink}
                    to={`/pets/${pet.id}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.75,
                      textDecoration: 'none',
                      color: 'text.primary',
                      minWidth: 72,
                      borderRadius: 2,
                      p: 0.5,
                      '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}` },
                    }}
                  >
                    <PetAvatar
                      pet={pet}
                      size={60}
                      sx={{
                        border: 3,
                        borderColor: theme.custom.species[pet.species] ?? 'divider',
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {pet.name}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                }}
              >
                <Section
                  icon={<MedicationOutlinedIcon />}
                  title={t('dashboard.doses')}
                  count={data.doses.filter((d) => !d.given).length}
                >
                  {data.doses.length === 0 ? (
                    <EmptyState compact emoji="💊" description={t('dashboard.noDoses')} />
                  ) : (
                    <List dense disablePadding>
                      {data.doses.slice(0, 8).map((d) => (
                        <ListItem
                          key={`${d.medication_id}-${d.at}`}
                          disableGutters
                          secondaryAction={
                            d.given ? (
                              <Chip
                                size="small"
                                color="success"
                                icon={<CheckIcon />}
                                label={t('dashboard.given')}
                              />
                            ) : isMobile ? (
                              <Tooltip title={t('dashboard.markGiven')}>
                                <IconButton
                                  aria-label={`${t('dashboard.markGiven')}: ${d.name}`}
                                  onClick={() => markGiven.mutate(d)}
                                  disabled={markGiven.isPending}
                                  sx={{
                                    border: 2,
                                    borderColor: d.overdue ? 'warning.main' : 'primary.main',
                                    color: d.overdue ? 'warning.main' : 'primary.main',
                                  }}
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Button
                                size="small"
                                variant={d.overdue ? 'contained' : 'outlined'}
                                color={d.overdue ? 'warning' : 'primary'}
                                onClick={() => markGiven.mutate(d)}
                                disabled={markGiven.isPending}
                              >
                                {t('dashboard.markGiven')}
                              </Button>
                            )
                          }
                        >
                          <ListItemAvatar>
                            <PetAvatar pet={{ name: d.pet_name, species: d.species }} size={36} />
                          </ListItemAvatar>
                          <ListItemText
                            sx={{ pr: { xs: 6, sm: 14 } }}
                            primary={`${d.name}${d.dose != null ? ` · ${formatNumber(d.dose)} ${d.unit ?? ''}` : ''}`}
                            secondary={`${d.pet_name} · ${doseDay(d.at)}${formatTime(d.at)}${d.overdue ? ` · ${t('dashboard.overdue')}` : ''}`}
                            slotProps={{
                              secondary: { color: d.overdue ? 'warning' : 'textSecondary' },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Section>

                <Section
                  icon={<EventOutlinedIcon />}
                  title={t('dashboard.appointments')}
                  count={data.appointments.length}
                >
                  {data.appointments.length === 0 ? (
                    <EmptyState compact emoji="📅" description={t('dashboard.noAppointments')} />
                  ) : (
                    <List dense disablePadding>
                      {data.appointments.map((a) => (
                        <ListItemButton
                          key={a.id}
                          component={RouterLink}
                          to={`/pets/${a.pet_id}/appointments`}
                          sx={{ mx: 0 }}
                        >
                          <ListItemAvatar>
                            <PetAvatar pet={{ name: a.pet_name, species: a.species }} size={36} />
                          </ListItemAvatar>
                          <ListItemText
                            primary={a.title}
                            secondary={`${a.pet_name} · ${formatDateTime(a.starts_at)}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Section>

                <Section
                  icon={<ShieldOutlinedIcon />}
                  title={t('dashboard.prevention')}
                  count={data.prevention.length}
                >
                  {data.prevention.length === 0 ? (
                    <EmptyState compact emoji="🛡️" description={t('dashboard.noPrevention')} />
                  ) : (
                    <List dense disablePadding>
                      {data.prevention.map((p) => (
                        <ListItemButton
                          key={p.id}
                          component={RouterLink}
                          to={`/pets/${p.pet_id}/prevention`}
                          sx={{ mx: 0 }}
                        >
                          <ListItemAvatar>
                            <PetAvatar pet={{ name: p.pet_name, species: p.species }} size={36} />
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${t(`prevention.types.${p.type}`)}${p.product ? ` · ${p.product}` : ''}`}
                            secondary={`${p.pet_name} · ${formatShortDate(p.due_date)} (${formatRelativeDays(p.due_date)})`}
                          />
                          <Chip
                            size="small"
                            color={p.status === 'overdue' ? 'error' : 'warning'}
                            variant="outlined"
                            label={t(`prevention.status.${p.status}`)}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Section>

                <Section
                  icon={<HealingOutlinedIcon />}
                  title={t('dashboard.attention')}
                  count={data.lowStock.length + data.illnesses.length}
                >
                  {data.lowStock.length + data.illnesses.length === 0 ? (
                    <EmptyState compact emoji="🌈" description={t('dashboard.allGood')} />
                  ) : (
                    <List dense disablePadding>
                      {data.illnesses.map((i) => (
                        <ListItemButton
                          key={`ill-${i.id}`}
                          component={RouterLink}
                          to={`/pets/${i.pet_id}/illnesses/${i.id}`}
                          sx={{ mx: 0 }}
                        >
                          <ListItemAvatar>
                            <PetAvatar pet={{ name: i.pet_name, species: i.species }} size={36} />
                          </ListItemAvatar>
                          <ListItemText
                            primary={i.title}
                            secondary={`${i.pet_name} · ${t('illness.since', { date: formatShortDate(i.started_on) })}`}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t(`illness.status.${i.status}`)}
                          />
                        </ListItemButton>
                      ))}
                      {data.lowStock.map((m) => (
                        <ListItemButton
                          key={`stock-${m.id}`}
                          component={RouterLink}
                          to={`/pets/${m.pet_id}/medications`}
                          sx={{ mx: 0 }}
                        >
                          <ListItemAvatar sx={{ color: 'warning.main' }}>
                            <Inventory2OutlinedIcon />
                          </ListItemAvatar>
                          <ListItemText
                            primary={t('dashboard.lowStock', { name: m.name })}
                            secondary={`${m.pet_name} · ${t('medications.stockLeft', { amount: formatNumber(m.stock), unit: m.unit ?? '' })}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Section>
              </Box>
            </Stack>
          )
        }
      </QueryState>
    </>
  );
}
