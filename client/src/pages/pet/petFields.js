import { SPECIES } from '../../lib/species.js';

export const petFields = (t) => [
  { name: 'name', label: t('pets.fields.name'), required: true },
  {
    name: 'species',
    label: t('pets.fields.species'),
    type: 'select',
    required: true,
    default: 'dog',
    half: true,
    options: SPECIES.map((s) => ({ value: s, label: t(`species.${s}`) })),
  },
  { name: 'breed', label: t('pets.fields.breed'), half: true },
  {
    name: 'sex',
    label: t('pets.fields.sex'),
    type: 'select',
    half: true,
    options: ['female', 'male', 'unknown'].map((s) => ({ value: s, label: t(`pets.sex.${s}`) })),
  },
  { name: 'birth_date', label: t('pets.fields.birthDate'), type: 'date', half: true },
  { name: 'color', label: t('pets.fields.color'), half: true },
  { name: 'microchip', label: t('pets.fields.microchip'), half: true },
  { name: 'neutered', label: t('pets.fields.neutered'), type: 'switch' },
  { name: 'notes', label: t('common.notes'), type: 'textarea' },
];
