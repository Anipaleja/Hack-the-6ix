import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Medication, Add } from '@mui/icons-material';

const Medications = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          💊 Medications
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => alert('Add medication functionality would go here')}
        >
          Add Medication
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Medication sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Medication Management
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              This page will allow you to:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • Add and manage your medications<br />
              • Set up medication schedules and alarms<br />
              • Track medication adherence<br />
              • View medication history<br />
              • Share medication list with family members<br />
              • Get medication interaction warnings
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Medications;
