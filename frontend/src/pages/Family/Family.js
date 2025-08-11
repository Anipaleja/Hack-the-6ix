import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Groups, PersonAdd } from '@mui/icons-material';

const FamilyPage = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          👨‍👩‍👧‍👦 Family Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => alert('Invite family member functionality would go here')}
        >
          Invite Member
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Groups sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Family Health Management
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Keep your family connected with:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • Family health overview dashboard<br />
              • Medication adherence monitoring<br />
              • Emergency alert notifications<br />
              • Shared health goals and progress<br />
              • Permission-based health data sharing<br />
              • Family member invite system
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FamilyPage;
