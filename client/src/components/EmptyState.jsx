import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

/**
 * Friendly empty state. Playful themes show a large, gently wiggling emoji;
 * the neutral themes show a quiet outline icon.
 */
export default function EmptyState({ emoji = '🐾', title, description, action, compact = false }) {
  const theme = useTheme();
  return (
    <Box sx={{ textAlign: 'center', py: compact ? 3 : 6, px: 2, color: 'text.secondary' }}>
      {theme.custom.playful ? (
        <Box
          aria-hidden
          sx={{
            fontSize: compact ? 40 : 64,
            lineHeight: 1,
            mb: 1.5,
            display: 'inline-block',
            animation: 'pm-wiggle 2.4s ease-in-out infinite',
          }}
        >
          {emoji}
        </Box>
      ) : (
        <InboxOutlinedIcon aria-hidden sx={{ fontSize: compact ? 32 : 48, mb: 1, opacity: 0.7 }} />
      )}
      {title && (
        <Typography variant={compact ? 'subtitle1' : 'h6'} color="text.primary" gutterBottom>
          {title}
        </Typography>
      )}
      {description && <Typography variant="body2">{description}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
