import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Timeline, Upload } from '@mui/icons-material';

const HealthData = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          📊 Health Data
        </Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => alert('Upload health data functionality would go here')}
        >
          Upload Data
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Timeline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Health Data & Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              This page will provide:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • Integration with Apple Health & Google Fit<br />
              • Manual health data entry<br />
              • Health trends and analytics<br />
              • Medical document upload<br />
              • Blood pressure, heart rate, and glucose tracking<br />
              • Export health reports for doctors
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HealthData;
