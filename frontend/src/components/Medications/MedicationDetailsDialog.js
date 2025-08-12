import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  Avatar
} from '@mui/material';
import {
  Close,
  MoreVert,
  Edit,
  Pause,
  PlayArrow,
  Delete,
  Schedule,
  TrendingUp,
  Person,
  LocalPharmacy,
  Warning,
  CheckCircle,
  AccessTime,
  Notifications,
  Assignment,
  Note
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../store/authStore';

const MedicationDetailsDialog = ({ open, onClose, medication, onUpdate }) => {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [adherenceHistory, setAdherenceHistory] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (medication && open) {
      fetchAdherenceHistory();
    }
  }, [medication, open]);

  const fetchAdherenceHistory = async () => {
    try {
      const response = await fetch(`/api/medications/${medication._id}/adherence-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAdherenceHistory(data);
      }
    } catch (error) {
      console.error('Error fetching adherence history:', error);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePauseMedication = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medications/${medication._id}/pause`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pauseReason: 'Paused by user' })
      });
      if (response.ok) {
        onUpdate();
        handleMenuClose();
      }
    } catch (error) {
      console.error('Error pausing medication:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeMedication = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medications/${medication._id}/resume`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        onUpdate();
        handleMenuClose();
      }
    } catch (error) {
      console.error('Error resuming medication:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/medications/${medication._id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: newNote,
          type: 'note'
        })
      });
      if (response.ok) {
        setNewNote('');
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medications/${medication._id}/take-dose`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error marking dose as taken:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!medication) return null;

  const getFrequencyText = (frequency) => {
    const frequencyMap = {
      'once_daily': 'Once daily',
      'twice_daily': 'Twice daily',
      'three_times_daily': '3 times daily',
      'four_times_daily': '4 times daily',
      'as_needed': 'As needed',
      'custom': 'Custom schedule'
    };
    return frequencyMap[frequency] || frequency;
  };

  const getNextDoseTime = () => {
    if (!medication.schedule.times || medication.schedule.times.length === 0) {
      return null;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const time of medication.schedule.times) {
      const doseTime = new Date(today);
      doseTime.setHours(time.hour, time.minute, 0, 0);
      
      if (doseTime > now) {
        return doseTime;
      }
    }
    
    // If no dose today, get first dose tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstTime = medication.schedule.times[0];
    tomorrow.setHours(firstTime.hour, firstTime.minute, 0, 0);
    return tomorrow;
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Basic Information */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalPharmacy color="primary" />
              Medication Details
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Common Name</Typography>
              <Typography variant="h6">{medication.commonName}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Scientific Name</Typography>
              <Typography variant="body1">{medication.scientificName}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Dosage</Typography>
              <Typography variant="body1">{medication.dosage.amount} {medication.dosage.unit}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Category</Typography>
              <Chip 
                label={medication.category.replace('_', ' ')} 
                size="small" 
                variant="outlined" 
              />
            </Box>
            {medication.purpose && (
              <Box>
                <Typography variant="body2" color="text.secondary">Purpose</Typography>
                <Typography variant="body1">{medication.purpose}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Schedule Information */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule color="primary" />
              Schedule
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Frequency</Typography>
              <Typography variant="body1">{getFrequencyText(medication.schedule.frequency)}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Times</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {medication.schedule.times.map((time, index) => (
                  <Chip
                    key={index}
                    label={`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
            {getNextDoseTime() && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Next Dose</Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime fontSize="small" />
                  {getNextDoseTime().toLocaleString()}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="body2" color="text.secondary">Start Date</Typography>
              <Typography variant="body1">
                {new Date(medication.schedule.startDate).toLocaleDateString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Adherence */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="primary" />
              Adherence
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Overall Rate</Typography>
                <Typography variant="h6" color="primary">
                  {Math.round(medication.adherence?.adherenceRate || 0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={medication.adherence?.adherenceRate || 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Grid container spacing={2} sx={{ textAlign: 'center' }}>
              <Grid item xs={4}>
                <Typography variant="h6" color="success.main">
                  {medication.adherence?.takenDoses || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Taken
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h6" color="error.main">
                  {medication.adherence?.missedDoses || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Missed
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h6" color="text.primary">
                  {medication.adherence?.totalDoses || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Inventory */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment color="primary" />
              Inventory
            </Typography>
            {medication.inventory?.totalPills && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Remaining Pills</Typography>
                  <Typography variant="h6">
                    {medication.inventory.remainingPills} / {medication.inventory.totalPills}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(medication.inventory.remainingPills / medication.inventory.totalPills) * 100}
                  sx={{ mb: 2, height: 6, borderRadius: 3 }}
                />
                {medication.needsRefill && (
                  <Alert severity="warning" size="small">
                    Refill needed soon
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Prescriber Information */}
      {medication.prescribedBy?.doctorName && (
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" />
                Prescriber Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Doctor</Typography>
                  <Typography variant="body1">{medication.prescribedBy.doctorName}</Typography>
                </Grid>
                {medication.prescribedBy.prescriptionDate && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Prescription Date</Typography>
                    <Typography variant="body1">
                      {new Date(medication.prescribedBy.prescriptionDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
                {medication.prescribedBy.prescriptionNumber && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Prescription Number</Typography>
                    <Typography variant="body1">{medication.prescribedBy.prescriptionNumber}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  const renderHistoryTab = () => (
    <Box>
      {adherenceHistory.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Adherence Trend (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adherenceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="adherenceRate"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ fill: '#1976d2' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No History Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start taking this medication to see adherence trends
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderNotesTab = () => (
    <Box>
      {/* Add Note */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add Note
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a note about this medication..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleAddNote}
            disabled={!newNote.trim() || loading}
            startIcon={<Note />}
          >
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Existing Notes */}
      {medication.notes && medication.notes.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notes & History
            </Typography>
            <List>
              {medication.notes.map((note, index) => (
                <ListItem key={index} divider={index < medication.notes.length - 1}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <Note fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={note.text}
                    secondary={`${new Date(note.addedAt).toLocaleString()} • ${note.type}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Note sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Notes Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add notes to track side effects, effectiveness, or other observations
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: medication.color || 'primary.main',
              width: 40,
              height: 40
            }}
          >
            💊
          </Avatar>
          <Box>
            <Typography variant="h6">{medication.commonName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {medication.scientificName}
            </Typography>
          </Box>
          {medication.isPaused && (
            <Chip icon={<Pause />} label="Paused" color="warning" size="small" />
          )}
        </Box>
        <Box>
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Overview" />
          <Tab label="History" />
          <Tab label="Notes" />
        </Tabs>

        {activeTab === 0 && renderOverviewTab()}
        {activeTab === 1 && renderHistoryTab()}
        {activeTab === 2 && renderNotesTab()}
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          color="success"
          onClick={handleMarkTaken}
          disabled={loading}
          startIcon={<CheckCircle />}
        >
          Mark as Taken
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => alert('Edit functionality')}>
          <Edit sx={{ mr: 1 }} />
          Edit Medication
        </MenuItem>
        {medication.isPaused ? (
          <MenuItem onClick={handleResumeMedication} disabled={loading}>
            <PlayArrow sx={{ mr: 1 }} />
            Resume
          </MenuItem>
        ) : (
          <MenuItem onClick={handlePauseMedication} disabled={loading}>
            <Pause sx={{ mr: 1 }} />
            Pause
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => alert('Delete functionality')} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default MedicationDetailsDialog;
