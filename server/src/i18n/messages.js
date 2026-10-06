// Server-side texts (push notifications only). The API itself returns error
// codes that are translated by the client.
const messages = {
  en: {
    medicationDue: {
      title: 'Medication due: {{pet}}',
      body: '{{medication}} {{dose}} at {{time}}',
    },
    lowStock: { title: 'Low stock: {{medication}}', body: 'Only {{stock}} left for {{pet}}.' },
    appointment: { title: 'Appointment: {{pet}}', body: '{{title}} on {{date}} at {{time}}' },
    preventionDue: { title: 'Due today: {{pet}}', body: '{{type}} {{product}}' },
    test: { title: 'Pet Manager', body: 'Test notification – it works!' },
    prevention: {
      deworming: 'Deworming',
      flea_tick: 'Flea & tick treatment',
      vaccination: 'Vaccination',
      dental: 'Dental care',
      grooming: 'Grooming',
      other: 'Prevention',
    },
  },
  de: {
    medicationDue: {
      title: 'Medikament fällig: {{pet}}',
      body: '{{medication}} {{dose}} um {{time}}',
    },
    lowStock: {
      title: 'Bestand niedrig: {{medication}}',
      body: 'Nur noch {{stock}} übrig für {{pet}}.',
    },
    appointment: { title: 'Termin: {{pet}}', body: '{{title}} am {{date}} um {{time}}' },
    preventionDue: { title: 'Heute fällig: {{pet}}', body: '{{type}} {{product}}' },
    test: { title: 'Pet Manager', body: 'Testbenachrichtigung – es funktioniert!' },
    prevention: {
      deworming: 'Entwurmung',
      flea_tick: 'Floh- & Zeckenschutz',
      vaccination: 'Impfung',
      dental: 'Zahnpflege',
      grooming: 'Fellpflege',
      other: 'Vorsorge',
    },
  },
};

export const SUPPORTED_LOCALES = Object.keys(messages);

function lookup(locale, key) {
  const tree = messages[locale] ?? messages.en;
  return key.split('.').reduce((node, part) => node?.[part], tree);
}

export function t(locale, key, vars = {}) {
  const template = lookup(locale, key) ?? lookup('en', key) ?? key;
  return String(template)
    .replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] ?? '').toString())
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDate(locale, date, tz) {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    dateStyle: 'medium',
    timeZone: tz,
  }).format(date);
}

export function formatTime(locale, date, tz) {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    timeStyle: 'short',
    timeZone: tz,
  }).format(date);
}

export function formatNumber(locale, value) {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    maximumFractionDigits: 3,
  }).format(value);
}

export { messages };
