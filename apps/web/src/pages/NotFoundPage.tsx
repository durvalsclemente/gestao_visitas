import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Box sx={{ textAlign: 'center', mt: 6 }}>
      <Typography variant="h3" gutterBottom>
        404
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Página não encontrada.
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Voltar ao início
      </Button>
    </Box>
  );
}
