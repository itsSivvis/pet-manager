import { createTheme, alpha } from '@mui/material/styles';
import { THEMES } from './tokens.js';
import { mix, readableTextOn } from './contrast.js';

function buildShadows(kind, mode) {
  const none = Array(25).fill('none');
  if (kind === 'none' || kind === 'flat') {
    // Flat themes rely on borders (light) or lighter surfaces (dark) for
    // elevation. Menus/dialogs keep a faint shadow so they stand out.
    const faint = mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(16,24,40,0.10)';
    return none.map((_, i) =>
      i === 0 ? 'none' : `0 ${Math.min(i, 8)}px ${Math.min(i * 3, 24)}px ${faint}`,
    );
  }
  // Soft, warm shadows for the friendlier themes.
  return none.map((_, i) =>
    i === 0
      ? 'none'
      : `0 ${Math.ceil(i / 2) + 1}px ${i * 2 + 4}px rgba(60, 40, 90, ${Math.min(0.06 + i * 0.008, 0.18)})`,
  );
}

/** Creates the MUI theme for a theme id (see tokens.js). */
export function createAppTheme(themeId) {
  const t = THEMES[themeId] ?? THEMES['neutral-light'];
  const c = t.colors;
  const dark = t.mode === 'dark';
  const lively = t.effects.motion === 'lively';
  const inputBorder = mix(c.text, c.surface, 0.45);

  const theme = createTheme({
    cssVariables: false,
    palette: {
      mode: t.mode,
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.secondary, contrastText: c.onSecondary },
      success: { main: c.success, contrastText: readableTextOn(c.success) },
      warning: { main: c.warning, contrastText: readableTextOn(c.warning) },
      error: { main: c.error, contrastText: readableTextOn(c.error) },
      info: { main: c.info, contrastText: readableTextOn(c.info) },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border,
    },
    shape: { borderRadius: t.shape.radius },
    shadows: buildShadows(t.effects.shadows, t.mode),
    typography: {
      fontFamily: t.typography.body,
      h1: { fontFamily: t.typography.heading, fontWeight: t.typography.headingWeight },
      h2: { fontFamily: t.typography.heading, fontWeight: t.typography.headingWeight },
      h3: { fontFamily: t.typography.heading, fontWeight: t.typography.headingWeight },
      h4: {
        fontFamily: t.typography.heading,
        fontWeight: t.typography.headingWeight,
        fontSize: '1.75rem',
      },
      h5: {
        fontFamily: t.typography.heading,
        fontWeight: t.typography.headingWeight,
        fontSize: '1.35rem',
      },
      h6: {
        fontFamily: t.typography.heading,
        fontWeight: t.typography.headingWeight,
        fontSize: '1.1rem',
      },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    transitions: lively ? undefined : { duration: { enteringScreen: 180, leavingScreen: 150 } },
  });

  const focusRing = {
    outline: `3px solid ${alpha(c.focus, dark ? 0.8 : 0.6)}`,
    outlineOffset: 2,
  };

  theme.custom = {
    id: t.id,
    tokens: t,
    species: t.species,
    playful: t.effects.playful,
    lively,
    surfaceRaised: c.surfaceRaised,
    accent: c.accent ?? c.secondary,
    inputBorder,
    chart: {
      line: c.primary,
      secondary: c.secondary,
      grid: c.border,
      axis: c.textMuted,
      tooltipBg: c.surfaceRaised,
    },
    speciesText: (species) =>
      readableTextOn(t.species[species] ?? t.species.other, '#16181D', '#FFFFFF'),
  };

  theme.components = {
    MuiCssBaseline: {
      styleOverrides: {
        html: { colorScheme: t.mode },
        body: { backgroundColor: c.background, WebkitFontSmoothing: 'antialiased' },
        '::selection': { backgroundColor: alpha(c.primary, 0.25) },
        ':focus-visible': focusRing,
        '@keyframes pm-pop-in': {
          from: { opacity: 0, transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes pm-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(6deg)' },
        },
        // Respect the user's OS setting: no decorative motion at all.
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: dark ? { backgroundImage: 'none' } : {},
        outlined: { borderColor: c.border },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: t.effects.shadows === 'soft' ? 'elevation' : 'outlined',
        elevation: t.effects.shadows === 'soft' ? 2 : 0,
      },
      styleOverrides: {
        root: {
          borderRadius: t.shape.cardRadius,
          backgroundColor: c.surface,
          ...(dark && { border: `1px solid ${c.border}` }),
          ...(lively && {
            animation: 'pm-pop-in 380ms cubic-bezier(.2,.9,.3,1.2) both',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            '@media (hover: hover)': {
              '&:hover': { transform: 'translateY(-3px)', boxShadow: theme.shadows[6] },
            },
          }),
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: t.effects.playful ? 999 : t.shape.radius,
          paddingInline: t.effects.playful ? 18 : 14,
          '&.Mui-focusVisible': focusRing,
          ...(lively && {
            transition: 'transform 120ms ease',
            '&:active': { transform: 'scale(0.96)' },
          }),
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { '&.Mui-focusVisible': focusRing } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: t.effects.playful ? 999 : t.shape.radius },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: t.shape.radius,
          backgroundColor: dark ? c.surfaceRaised : c.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: inputBorder },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: t.shape.cardRadius, backgroundColor: c.surfaceRaised },
      },
    },
    MuiMenu: { styleOverrides: { paper: { backgroundColor: c.surfaceRaised } } },
    MuiPopover: { styleOverrides: { paper: { backgroundColor: c.surfaceRaised } } },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: alpha(c.background, 0.88),
          backdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: `1px solid ${c.border}`,
          color: c.text,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: dark ? c.surface : c.background, borderColor: c.border },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: t.shape.radius,
          marginInline: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(c.primary, dark ? 0.2 : 0.1),
            color: dark ? c.primary : c.text,
            '& .MuiListItemIcon-root': { color: c.primary },
          },
          '&.Mui-focusVisible': focusRing,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          '&.Mui-focusVisible': focusRing,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: dark ? c.surfaceRaised : c.text,
          color: dark ? c.text : c.surface,
          fontSize: 13,
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: t.shape.radius } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999 } } },
  };

  return theme;
}
