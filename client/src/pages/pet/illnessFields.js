export const ILLNESS_STATUS_COLOR = { active: 'warning', chronic: 'info', resolved: 'success' };

export const illnessFields = (t) => [
  { name: 'title', label: t('common.title'), required: true },
  {
    name: 'status',
    label: t('illness.statusLabel'),
    type: 'select',
    required: true,
    half: true,
    options: ['active', 'chronic', 'resolved'].map((s) => ({
      value: s,
      label: t(`illness.status.${s}`),
    })),
  },
  { name: 'started_on', label: t('illness.startedOn'), type: 'date', required: true, half: true },
  { name: 'ended_on', label: t('illness.endedOn'), type: 'date', half: true },
  { name: 'diagnosis', label: t('illness.diagnosis'), type: 'textarea' },
  { name: 'notes', label: t('common.notes'), type: 'textarea' },
];
