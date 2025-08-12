import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Fab,
  Tooltip,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Badge
} from '@mui/material';
import {
  Add,
  Schedule,
  Notifications,
  TrendingUp,
  Edit,
  Delete,
  Pause,
  PlayArrow,
  Warning,
  CheckCircle,
  AccessTime,
  LocalPharmacy,
  Assignment,
  NotificationImportant
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import MedicationCard from '../../components/Medications/MedicationCard';
import AddMedicationDialog from '../../components/Medications/AddMedicationDialog';
import MedicationDetailsDialog from '../../components/Medications/MedicationDetailsDialog';

const Medications = () => {
  const { user, token } = useAuthStore();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [upcomingAlarms, setUpcomingAlarms] = useState([]);
  const [adherenceData, setAdherenceData] = useState({
    overallRate: 0,
    totalMedications: 0,
    activeMedications: 0
  });

  useEffect(() => {
    if (token) {
      fetchMedications();
      fetchUpcomingAlarms();
      fetchAdherenceData();
    }
  }, [token]);

  const fetchMedications = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/medications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMedications(data.medications || []);
      } else {
        console.error('Failed to fetch medications:', response.status);
        setMedications([]);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      setMedications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingAlarms = async () => {
    if (!token) return;
    
    // For now, using mock data since the endpoint doesn't exist
    // TODO: Implement upcoming-alarms endpoint in backend
    setUpcomingAlarms([]);
  };

  const fetchAdherenceData = async () => {
    if (!token) return;
    
    // For now, using mock data since the endpoint doesn't exist
    // TODO: Implement adherence-summary endpoint in backend
    setAdherenceData({
      overallRate: 85,
      totalMedications: medications.length,
      activeMedications: medications.filter(med => med.isActive).length
    });
  };

  const handleMedicationClick = (medication) => {
    setSelectedMedication(medication);
    setDetailsDialogOpen(true);
  };

  const handleMarkTaken = async (medicationId) => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/medications/${medicationId}/take-dose`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        fetchMedications();
        fetchUpcomingAlarms();
        fetchAdherenceData();
      } else {
        console.error('Failed to mark medication as taken:', response.status);
      }
    } catch (error) {
      console.error('Error marking dose as taken:', error);
    }
  };

  const activeMedications = medications.filter(med => med.isActive && !med.isPaused);
  const pausedMedications = medications.filter(med => med.isActive && med.isPaused);
  const needsRefill = medications.filter(med => med.needsRefill);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Medications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your medication schedule and track adherence
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
          size="large"
        >
          Add Medication
        </Button>
      </Box>

      {loading ? (
        <LinearProgress sx={{ mb: 3 }} />
      ) : (
        <>
          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <LocalPharmacy sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">{activeMedications.length}</Typography>
                  <Typography variant="body2">Active Medications</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">{adherenceData.overallRate}%</Typography>
                  <Typography variant="body2">Adherence Rate</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: upcomingAlarms.length > 0 ? 'warning.main' : 'info.main', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Badge badgeContent={upcomingAlarms.length} color="error">
                    <Schedule sx={{ fontSize: 40, mb: 1 }} />
                  </Badge>
                  <Typography variant="h4">{upcomingAlarms.length}</Typography>
                  <Typography variant="body2">Due Soon</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: needsRefill.length > 0 ? 'error.main' : 'secondary.main', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Badge badgeContent={needsRefill.length} color="warning">
                    <NotificationImportant sx={{ fontSize: 40, mb: 1 }} />
                  </Badge>
                  <Typography variant="h4">{needsRefill.length}</Typography>
                  <Typography variant="body2">Need Refill</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Upcoming Doses */}
          {upcomingAlarms.length > 0 && (
            <Card sx={{ mb: 3, border: 2, borderColor: 'warning.main' }}>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccessTime color="warning" />
                  Upcoming Doses
                </Typography>
                <List dense>
                  {upcomingAlarms.slice(0, 3).map((alarm, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'warning.light', width: 32, height: 32 }}>
                          <LocalPharmacy />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={alarm.medicationName}
                        secondary={`Due at ${new Date(alarm.dueTime).toLocaleTimeString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleMarkTaken(alarm.medicationId)}
                        >
                          Take Now
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Refill Alerts */}
          {needsRefill.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2">Refill Needed:</Typography>
              {needsRefill.map(med => med.commonName).join(', ')} - Contact your pharmacy or doctor
            </Alert>
          )}

          {/* Active Medications */}
          {activeMedications.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" />
                Active Medications ({activeMedications.length})
              </Typography>
              <Grid container spacing={2}>
                {activeMedications.map((medication) => (
                  <Grid item xs={12} md={6} lg={4} key={medication._id}>
                    <MedicationCard
                      medication={medication}
                      onClick={() => handleMedicationClick(medication)}
                      onMarkTaken={handleMarkTaken}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalPharmacy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Active Medications
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Start by adding your first medication to track schedules and adherence.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddDialogOpen(true)}
                  >
                    Add First Medication
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Paused Medications */}
          {pausedMedications.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Pause color="warning" />
                Paused Medications ({pausedMedications.length})
              </Typography>
              <Grid container spacing={2}>
                {pausedMedications.map((medication) => (
                  <Grid item xs={12} md={6} lg={4} key={medication._id}>
                    <MedicationCard
                      medication={medication}
                      onClick={() => handleMedicationClick(medication)}
                      isPaused={true}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}

      {/* Floating Action Button for Quick Add */}
      <Fab
        color="primary"
        aria-label="add medication"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setAddDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Dialogs */}
      <AddMedicationDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={() => {
          setAddDialogOpen(false);
          fetchMedications();
          fetchAdherenceData();
        }}
      />

      <MedicationDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        medication={selectedMedication}
        onUpdate={() => {
          fetchMedications();
          fetchAdherenceData();
        }}
      />
    </Box>
  );
};

export default Medications;
