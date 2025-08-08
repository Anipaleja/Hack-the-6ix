import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Medication,
  Timeline,
  Family,
  Psychology,
  CheckCircle,
  Schedule,
  Warning,
  TrendingUp,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../contexts/SocketContext';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { isConnected } = useSocket();

  // Mock data - in a real app, this would come from API calls
  const stats = {
    medicationsToday: 3,
    medicationsTaken: 1,
    upcomingAlarms: 2,
    healthScore: 85,
  };

  const upcomingMedications = [
    {
      id: 1,
      name: 'Lisinopril',
      dosage: '10mg',
      time: '14:00',
      status: 'upcoming',
    },
    {
      id: 2,
      name: 'Metformin',
      dosage: '500mg',
      time: '18:00',
      status: 'upcoming',
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'medication',
      message: 'Took Aspirin 81mg',
      time: '2 hours ago',
      icon: <CheckCircle color="success" />,
    },
    {
      id: 2,
      type: 'health_data',
      message: 'Blood pressure recorded: 120/80',
      time: '4 hours ago',
      icon: <Timeline color="primary" />,
    },
    {
      id: 3,
      type: 'ai_query',
      message: 'Asked about medication interactions',
      time: '1 day ago',
      icon: <Psychology color="secondary" />,
    },
  ];

  const adherenceRate = (stats.medicationsTaken / stats.medicationsToday) * 100;

  return (
    <Box>
      {/* Welcome section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.firstName}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's your health overview for today
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quick stats */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Medication />
                </Avatar>
                <Typography variant="h6">Medications</Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.medicationsTaken}/{stats.medicationsToday}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Taken today
              </Typography>
              <LinearProgress
                variant="determinate"
                value={adherenceRate}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Typography variant="h6">Upcoming</Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.upcomingAlarms}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Medications due
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Typography variant="h6">Health Score</Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.healthScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall wellness
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <Family />
                </Avatar>
                <Typography variant="h6">Connection</Typography>
              </Box>
              <Chip
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'error'}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Real-time sync
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming medications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Upcoming Medications</Typography>
                <Button size="small" href="/medications">
                  View All
                </Button>
              </Box>
              <List>
                {upcomingMedications.map((med) => (
                  <ListItem key={med.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <Medication />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${med.name} ${med.dosage}`}
                      secondary={`Due at ${med.time}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={med.status}
                        color="warning"
                        size="small"
                        variant="outlined"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              {upcomingMedications.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No upcoming medications
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Activities</Typography>
              </Box>
              <List>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        {activity.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.message}
                      secondary={activity.time}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Medication />}
                    href="/medications"
                    sx={{ py: 1.5 }}
                  >
                    Add Medication
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Timeline />}
                    href="/health-data"
                    sx={{ py: 1.5 }}
                  >
                    Log Health Data
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Psychology />}
                    href="/ai-assistant"
                    sx={{ py: 1.5 }}
                  >
                    Ask AI Assistant
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Family />}
                    href="/family"
                    sx={{ py: 1.5 }}
                  >
                    Family Dashboard
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
