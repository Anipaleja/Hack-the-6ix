import React, { useState, useEffect } from 'react';
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
  Alert,
  Divider,
  Badge
} from '@mui/material';
import {
  Medication,
  Timeline,
  Groups,
  Psychology,
  CheckCircle,
  Schedule,
  Warning,
  TrendingUp,
  AccessTime,
  LocalPharmacy,
  NotificationImportant,
  PlayArrow
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../contexts/SocketContext';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { isConnected } = useSocket();
  const [dashboardData, setDashboardData] = useState({
    medications: {
      total: 0,
      active: 0,
      dueSoon: [],
      overdue: [],
      adherenceRate: 0
    },
    healthData: {
      lastSyncDate: null,
      recentMetrics: []
    },
    family: {
      memberCount: 0,
      recentAlerts: []
    },
    aiQueries: {
      totalQueries: 0,
      recentQueries: []
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (medicationId) => {
    try {
      const response = await fetch(`/api/medications/${medicationId}/take`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error marking medication as taken:', error);
    }
  };

  const getTimeUntilDose = (doseTime) => {
    const now = new Date();
    const dose = new Date(doseTime);
    const diffMs = dose - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 0) return 'Overdue';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins/60)}h ${diffMins%60}m`;
    return `${Math.floor(diffMins/1440)}d`;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your comprehensive health management dashboard
        </Typography>
        {!isConnected && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Connection lost. Some features may not work properly.
          </Alert>
        )}
      </Box>

      {loading ? (
        <LinearProgress sx={{ mb: 3 }} />
      ) : (
        <>
          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {dashboardData.medications.active}
                      </Typography>
                      <Typography variant="body2">
                        Active Medications
                      </Typography>
                    </Box>
                    <LocalPharmacy sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {Math.round(dashboardData.medications.adherenceRate)}%
                      </Typography>
                      <Typography variant="body2">
                        Adherence Rate
                      </Typography>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: dashboardData.medications.dueSoon.length > 0 ? 'warning.main' : 'info.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {dashboardData.medications.dueSoon.length}
                      </Typography>
                      <Typography variant="body2">
                        Due Soon
                      </Typography>
                    </Box>
                    <Badge badgeContent={dashboardData.medications.dueSoon.length} color="error">
                      <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Badge>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {dashboardData.family.memberCount}
                      </Typography>
                      <Typography variant="body2">
                        Family Members
                      </Typography>
                    </Box>
                    <Groups sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Overdue Medications Alert */}
          {dashboardData.medications.overdue.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Overdue Medications ({dashboardData.medications.overdue.length})
              </Typography>
              <Typography variant="body2">
                {dashboardData.medications.overdue.map(med => med.commonName).join(', ')} - Please take as soon as possible
              </Typography>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Upcoming Medications */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule color="primary" />
                    Upcoming Medications
                  </Typography>
                  
                  {dashboardData.medications.dueSoon.length > 0 ? (
                    <List>
                      {dashboardData.medications.dueSoon.slice(0, 5).map((medication, index) => (
                        <ListItem key={index} divider={index < Math.min(dashboardData.medications.dueSoon.length, 5) - 1}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.light' }}>
                              <LocalPharmacy />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={medication.commonName}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {medication.dosage.amount} {medication.dosage.unit}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={getTimeUntilDose(medication.nextDose)}
                                  color={getTimeUntilDose(medication.nextDose) === 'Overdue' ? 'error' : 'warning'}
                                  variant="outlined"
                                />
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleMarkTaken(medication._id)}
                              startIcon={<CheckCircle />}
                            >
                              Take
                            </Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        All caught up! No medications due soon.
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Button variant="outlined" fullWidth href="/medications">
                    View All Medications
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Family Updates */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Groups color="primary" />
                    Family Updates
                  </Typography>
                  
                  {dashboardData.family.recentAlerts.length > 0 ? (
                    <List>
                      {dashboardData.family.recentAlerts.slice(0, 3).map((alert, index) => (
                        <ListItem key={index} divider={index < 2}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alert.type === 'medication' ? 'warning.light' : 'info.light' }}>
                              {alert.type === 'medication' ? <NotificationImportant /> : <Groups />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={alert.message}
                            secondary={new Date(alert.timestamp).toLocaleString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Groups sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No recent family updates
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Button variant="outlined" fullWidth href="/family">
                    View Family Dashboard
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timeline color="primary" />
                    Recent Activity
                  </Typography>
                  
                  <List>
                    {dashboardData.aiQueries.recentQueries.slice(0, 3).map((query, index) => (
                      <ListItem key={index} divider={index < 2}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.light' }}>
                            <Psychology />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="AI Health Query"
                          secondary={`${query.query.substring(0, 50)}...`}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(query.createdAt).toLocaleDateString()}
                        </Typography>
                      </ListItem>
                    ))}
                    
                    {dashboardData.healthData.recentMetrics.slice(0, 2).map((metric, index) => (
                      <ListItem key={`metric-${index}`} divider>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.light' }}>
                            <Timeline />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${metric.type} recorded`}
                          secondary={`${metric.value} ${metric.unit}`}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(metric.recordedAt).toLocaleDateString()}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 2 }} />
                  <Button variant="outlined" fullWidth href="/ai-assistant">
                    Ask AI Assistant
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Health Overview */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp color="primary" />
                    Health Overview
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Medication Adherence</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {Math.round(dashboardData.medications.adherenceRate)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.medications.adherenceRate}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: dashboardData.medications.adherenceRate >= 80 ? 'success.main' : 
                                  dashboardData.medications.adherenceRate >= 60 ? 'warning.main' : 'error.main'
                        }
                      }}
                    />
                  </Box>

                  {dashboardData.healthData.lastSyncDate && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Last Health Data Sync
                      </Typography>
                      <Typography variant="body1">
                        {new Date(dashboardData.healthData.lastSyncDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Button variant="outlined" fullWidth href="/health-data">
                    View Health Data
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
