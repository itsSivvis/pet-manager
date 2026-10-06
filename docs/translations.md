# Translation guide

The UI uses [react-i18next](https://react.i18next.com). **English is the
default and fallback language**; German is fully translated.

```
client/src/i18n/
├── index.js          ← i18next setup, language detection, dayjs locale
└── locales/
    ├── en.json       ← reference (every key must exist here)
    └── de.json
```

- On first visit the browser language is used (`navigator.language`); the
  user can change it in **Settings → Language**. The choice is stored in
  `localStorage` (`pm.lang`) and in the user profile.
- Dates and numbers are formatted with the `Intl` API according to the active
  language (`client/src/lib/format.js`). Never format dates by hand.
- The API returns **error codes** (e.g. `AUTH_INVALID_CREDENTIALS`), which the
  client translates via `errors.<CODE>`.
- Push notifications are translated on the server
  (`server/src/i18n/messages.js`); the language is chosen in the admin area.
- The PDF export uses the active UI language.

## Using translations in code

```jsx
const { t } = useTranslation();
<Button>{t('pets.add')}</Button>;
t('medications.stockLeft', { amount: 3, unit: 'ml' }); // interpolation: "{{amount}} {{unit}} left"
t('pets.openIllnesses', { count: 2 }); // plurals: key_one / key_other
```

Prefer literal keys (`t('pets.add')`) – the checker can then verify that they
exist. Dynamic keys (`t(\`species.${species}\`)`) are fine for enumerations.

## Checking completeness

```bash
npm run i18n:check
```

The script (also run in CI) reports:

- keys missing in a language or present only in a non-reference language,
- empty translations,
- placeholders (`{{name}}`) that differ between languages,
- literal keys used in the code that are missing in `en.json`,
- API error codes thrown by the server without an `errors.<CODE>` translation.

## Adding a new language

1. Copy `client/src/i18n/locales/en.json` to `<code>.json` (e.g. `fr.json`)
   and translate all values. Keep keys and `{{placeholders}}` unchanged.
2. Register it in `client/src/i18n/index.js`: import the file, add it to
   `resources` and to `LANGUAGES` (`{ code: 'fr', label: 'Français' }`), and
   import the dayjs locale (`import 'dayjs/locale/fr'`).
3. Optional: add server notification texts to `server/src/i18n/messages.js`
   and allow the code in the `locale` checks of the API
   (`server/src/routes/auth.js`, `server/src/routes/admin.js`) and the
   `users.locale` constraint (new migration).
4. Run `npm run i18n:check` and `npm test`.
