import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { THEMES, THEME_IDS, DEFAULT_LIGHT, DEFAULT_DARK } from '../theme/tokens.js';
import { useThemeMode } from '../theme/ThemeModeProvider.jsx';

// Every theme defined in tokens.js shows up automatically.
const OPTIONS = ['system', ...THEME_IDS];

function swatches(id) {
  if (id === 'system') {
    const l = THEMES[DEFAULT_LIGHT].colors;
    const d = THEMES[DEFAULT_DARK].colors;
    return [l.background, l.primary, d.background, d.primary];
  }
  const c = THEMES[id].colors;
  return [c.background, c.surface, c.primary, c.accent ?? c.secondary];
}

/** Preview chips with color swatches; switching is instant (no reload). */
export default function ThemePicker({ compact = false }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { choice, setChoice } = useThemeMode();

  return (
    <Box
      role="radiogroup"
      aria-label={t('settings.theme')}
      sx={{
        display: 'grid',
        gridTemplateColumns: compact
          ? '1fr'
          : { xs: '1fr 1fr', sm: 'repeat(auto-fill, minmax(150px, 1fr))' },
        gap: 1.5,
      }}
    >
      {OPTIONS.map((id) => {
        const selected = choice === id;
        return (
          <ButtonBase
            key={id}
            role="radio"
            aria-checked={selected}
            onClick={() => setChoice(id)}
            focusRipple
            sx={{
              display: 'flex',
              flexDirection: compact ? 'row' : 'column',
              alignItems: compact ? 'center' : 'stretch',
              gap: 1,
              p: 1.25,
              borderRadius: `${theme.shape.borderRadius}px`,
              border: 2,
              borderColor: selected ? 'primary.main' : 'divider',
              bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
              textAlign: 'left',
              '&.Mui-focusVisible': {
                outline: `3px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                borderRadius: 1,
                overflow: 'hidden',
                height: compact ? 24 : 36,
                minWidth: compact ? 64 : 'auto',
                border: 1,
                borderColor: 'divider',
              }}
              aria-hidden
            >
              {swatches(id).map((color, i) => (
                <Box key={i} sx={{ flex: 1, bgcolor: color }} />
              ))}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                  {t(`themes.${id}.name`)}
                </Typography>
                {selected && <CheckCircleIcon color="primary" fontSize="small" />}
              </Box>
              {!compact && (
                <Typography variant="caption" color="textSecondary">
                  {t(`themes.${id}.description`)}
                </Typography>
              )}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
