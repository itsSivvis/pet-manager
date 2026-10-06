import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import { photoUrl } from '../api/client.js';
import { SPECIES_EMOJI } from '../lib/species.js';

/** Pet photo, or a species-colored avatar with emoji (playful) / initial. */
export default function PetAvatar({ pet, size = 40, sx }) {
  const theme = useTheme();
  const species = pet?.species ?? 'other';
  const color = theme.custom.species[species] ?? theme.custom.species.other;
  return (
    <Avatar
      src={photoUrl(pet?.photo)}
      alt={pet?.name ?? ''}
      sx={{
        width: size,
        height: size,
        bgcolor: color,
        color: theme.custom.speciesText(species),
        fontSize: size * (theme.custom.playful ? 0.55 : 0.42),
        fontWeight: 700,
        ...sx,
      }}
    >
      {theme.custom.playful ? SPECIES_EMOJI[species] : (pet?.name?.[0] ?? '?').toUpperCase()}
    </Avatar>
  );
}
