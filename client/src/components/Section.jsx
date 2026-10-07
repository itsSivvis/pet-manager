import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

/** Card with a heading, used on the settings and administration pages. */
export default function Section({ title, description, children }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ mb: description ? 0 : 2 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
