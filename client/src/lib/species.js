import PetsIcon from '@mui/icons-material/Pets';
import { SPECIES } from '../theme/tokens.js';

export { SPECIES };

// Emojis are used as friendly illustrations (playful themes) and as avatar
// fallbacks. They are Unicode characters rendered by the OS emoji font.
export const SPECIES_EMOJI = {
  dog: '🐶',
  cat: '🐱',
  rabbit: '🐰',
  rodent: '🐹',
  bird: '🐦',
  fish: '🐟',
  reptile: '🦎',
  horse: '🐴',
  other: '🐾',
};

export const SpeciesFallbackIcon = PetsIcon;
