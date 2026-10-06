import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

/** App logo: a simple paw mark drawn in the current theme's primary color. */
export default function Logo({ size = 32 }) {
  const theme = useTheme();
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      sx={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden
    >
      <rect
        width="64"
        height="64"
        rx={theme.custom.playful ? 22 : 16}
        fill={theme.palette.primary.main}
      />
      <g fill={theme.palette.primary.contrastText}>
        <ellipse cx="20" cy="24" rx="5.5" ry="7" />
        <ellipse cx="32" cy="18" rx="5.5" ry="7" />
        <ellipse cx="44" cy="24" rx="5.5" ry="7" />
        <path d="M32 30c-8 0-15 9-15 15 0 4 3 6 7 6 3 0 5-2 8-2s5 2 8 2c4 0 7-2 7-6 0-6-7-15-15-15z" />
      </g>
    </Box>
  );
}
