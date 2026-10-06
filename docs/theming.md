# Theming guide

Pet Manager ships four themes that users can switch at runtime (Settings →
Appearance, or the palette icon in the top bar):

| Id              | Name          | Character                                                                                                                                                                     |
| --------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `neutral-light` | Neutral Light | Calm and minimal: grey neutrals, one restrained blue accent, flat surfaces with borders, 8 px radius, Inter.                                                                  |
| `neutral-dark`  | Neutral Dark  | Dark counterpart (`#121417`, no pure black). Elevation through lighter surfaces instead of shadows.                                                                           |
| `playful`       | Playful       | Warm cream background, violet/raspberry accents, large radii, Nunito + Fredoka, one accent color per species, emoji avatars and empty states, gentle pop-in/hover animations. |
| `meadow`        | Meadow        | The original teal & coral look, kept as an optional theme.                                                                                                                    |

The default is **Automatic**: Neutral Light or Neutral Dark depending on the
operating system's `prefers-color-scheme`. The choice is stored per device in
`localStorage` (`pm.theme`).

## How it works

```
client/src/theme/
├── tokens.js            ← the only place where colors, radii and fonts are defined
├── createAppTheme.js    ← turns tokens into a MUI theme (+ component overrides)
├── ThemeModeProvider.jsx← stores the choice, follows the OS setting, updates <meta theme-color>
├── resolveThemeId.js
├── contrast.js          ← WCAG contrast helpers
└── tokens.test.js       ← enforces WCAG AA for every theme
client/public/theme-init.js ← runs before the bundle to avoid a flash of the wrong theme
```

Components **never** hard-code colors. They use the MUI palette
(`color="primary"`, `bgcolor: 'background.paper'`, `theme.palette.text.secondary`)
or the extras in `theme.custom`:

| `theme.custom.…`                       | Purpose                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `species[species]`                     | Accent color per animal species (avatars, card accents).                                |
| `speciesText(species)`                 | Readable text color on top of a species color.                                          |
| `chart.line / grid / axis / tooltipBg` | Colors for Recharts.                                                                    |
| `playful`                              | `true` for themes that use emoji illustrations and avatars.                             |
| `lively`                               | `true` if decorative animations are enabled (always off with `prefers-reduced-motion`). |
| `accent`                               | Decorative accent color (never for text).                                               |

## Adding a new theme

1. **Add tokens** to `THEMES` in `client/src/theme/tokens.js`. Copy an
   existing theme and change the values. Required keys:
   - `mode`: `'light'` or `'dark'`
   - `colors`: `background`, `surface`, `surfaceRaised`, `text`, `textMuted`,
     `border`, `primary`, `onPrimary`, `secondary`, `onSecondary`, `success`,
     `warning`, `error`, `info`, `focus` (optional `accent`)
   - `species`: one color for each species
   - `shape`, `typography`, `effects` (`shadows`: `flat`/`none`/`soft`,
     `motion`: `subtle`/`lively`, `playful`: boolean)
2. **Add the background** to `THEME_BACKGROUNDS` in
   `client/public/theme-init.js` (prevents flashing on load). A unit test
   fails if you forget this.
3. **Add a name and description** under `themes.<id>` in
   `client/src/i18n/locales/en.json` and `de.json`.
4. Run `npm test --workspace client`. The tests check that all text colors
   reach **4.5:1** on background and surfaces, button texts reach 4.5:1 and
   input borders/focus rings reach **3:1**. Adjust colors until they pass.
5. Check the result visually: `npm run screenshots` (see below) and look at
   the dashboard, forms, charts and the illness timeline on mobile and desktop.

The theme picker lists every theme from `tokens.js` automatically.

### Fonts

Fonts are self-hosted through [Fontsource](https://fontsource.org) packages
(no requests to Google Fonts – important for privacy/GDPR). To use a new font,
`npm install @fontsource/<font> --workspace client`, import it in
`client/src/main.jsx` and reference it in the theme's `typography`. Only use
fonts with a license that allows redistribution (e.g. SIL OFL).

### Motion

Decorative animations (card pop-in, hover lift, wiggling empty-state emoji)
are only enabled for themes with `effects.motion: 'lively'`. A global CSS rule
disables all animations and transitions when the user has
`prefers-reduced-motion: reduce` set.

## Screenshots

```bash
npm run build && npm run db:seed && npm start          # or use Docker
CHROMIUM_PATH=/path/to/chromium npm run screenshots    # optional env: THEMES, PAGES, BASE_URL
```

Images are written to `docs/screenshots/<theme>/<mobile|desktop>-<page>.png`.
