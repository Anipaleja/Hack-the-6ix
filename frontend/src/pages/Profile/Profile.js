import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Person } from '@mui/icons-material';

const Profile = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        👤 Profile
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              User Profile Management
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Manage your personal information:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • Personal details and contact information<br />
              • Medical profile and conditions<br />
              • Emergency contacts<br />
              • Health goals and preferences<br />
              • Account security settings<br />
              • Privacy and data sharing preferences
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
