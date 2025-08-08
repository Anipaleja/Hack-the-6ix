import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        ⚙️ Settings
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Application Settings
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Configure your app preferences:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • Notification preferences and schedules<br />
              • Health device integrations<br />
              • Data sync settings<br />
              • Privacy and security options<br />
              • Language and accessibility<br />
              • Backup and export options
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
