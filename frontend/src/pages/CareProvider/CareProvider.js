import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Paper,
  LinearProgress,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  LocalHospital,
  CheckCircle,
  Schedule,
  Assignment,
  Person,
  Phone,
  Email,
  LocationOn,
  Add,
  Edit,
  Delete,
  AccessTime,
  CalendarToday,
  MedicalServices,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const CareProvider = () => {
  const [tabValue, setTabValue] = useState(0);
  const [checklist, setChecklist] = useState([]);
  const [careProviders, setCareProviders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [openProviderDialog, setOpenProviderDialog] = useState(false);
  const [openChecklistDialog, setOpenChecklistDialog] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    specialty: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [newChecklistItem, setNewChecklistItem] = useState({
    task: '',
    providerName: '',
    priority: 'medium',
    dueDate: ''
  });

  const { token } = useAuthStore();

  // Fetch data from backend
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [providersRes, checklistRes] = await Promise.all([
        fetch('/api/care-provider/providers', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/care-provider/checklist', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setCareProviders(providersData.data || []);
      }

      if (checklistRes.ok) {
        const checklistData = await checklistRes.json();
        setChecklist(checklistData.data || []);
      }

      // Sample appointments (could be expanded with real API)
      setAppointments([
        {
          id: 1,
          provider: 'Dr. Sarah Johnson',
          date: '2025-08-20',
          time: '10:00 AM',
          type: 'Follow-up',
          status: 'scheduled'
        },
        {
          id: 2,
          provider: 'Dr. Michael Chen',
          date: '2025-08-25',
          time: '2:30 PM',
          type: 'Consultation',
          status: 'scheduled'
        }
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load care provider data');
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistToggle = async (id) => {
    try {
      const item = checklist.find(item => item._id === id);
      const response = await fetch(`/api/care-provider/checklist/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !item.completed })
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setChecklist(prev => prev.map(item => 
          item._id === id ? updatedItem.data : item
        ));
        toast.success(updatedItem.data.completed ? 'Task completed!' : 'Task marked as incomplete');
      } else {
        toast.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast.error('Failed to update task');
    }
  };

  const handleAddProvider = async () => {
    try {
      const response = await fetch('/api/care-provider/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProvider)
      });

      if (response.ok) {
        const providerData = await response.json();
        setCareProviders(prev => [...prev, providerData.data]);
        setNewProvider({ name: '', specialty: '', phone: '', email: '', address: '', notes: '' });
        setOpenProviderDialog(false);
        toast.success('Care provider added successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add provider');
      }
    } catch (error) {
      console.error('Error adding provider:', error);
      toast.error('Failed to add provider');
    }
  };

  const handleAddChecklistItem = async () => {
    try {
      const response = await fetch('/api/care-provider/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newChecklistItem)
      });

      if (response.ok) {
        const checklistData = await response.json();
        setChecklist(prev => [...prev, checklistData.data]);
        setNewChecklistItem({ task: '', providerName: '', priority: 'medium', dueDate: '' });
        setOpenChecklistDialog(false);
        toast.success('Care task added successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add task');
      }
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast.error('Failed to add task');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getCompletionStats = () => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.completed).length;
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const getFilteredChecklist = () => {
    return checklist.filter(item => {
      const priorityMatch = filterPriority === 'all' || item.priority === filterPriority;
      const completedMatch = showCompleted || !item.completed;
      return priorityMatch && completedMatch;
    });
  };

  const stats = getCompletionStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LocalHospital sx={{ mr: 2, color: 'primary.main' }} />
          RPN Care Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          Manage tasks for your Registered Practical Nurse (RPN) and coordinate care.
          Only clients and family members can add new tasks to ensure proper care coordination.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Progress Overview */}
          <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} sx={{ textAlign: 'center' }}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                  {stats.completed}/{stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Tasks Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="h3" color="secondary" sx={{ fontWeight: 'bold' }}>
                  {careProviders.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  RPN Providers
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                  {appointments.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Upcoming Appointments
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2, mx: 'auto', maxWidth: 600 }}>
                <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                  Overall Progress: {Math.round(stats.percentage)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.percentage}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

        {/* Tabs */}
        <Card>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="RPN Tasks" icon={<Assignment />} />
            <Tab label="RPN Providers" icon={<Person />} />
            <Tab label="Appointments" icon={<Schedule />} />
            <Tab label="Care Notes" icon={<AssignmentIcon />} />
          </Tabs>        {/* Care Checklist Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">RPN Tasks Checklist</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenChecklistDialog(true)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add RPN Task
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Only clients and family members can add new tasks for the RPN to complete. 
              Check off tasks once your RPN has completed them.
            </Typography>
          </Alert>

          {/* Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="high">High Priority</MenuItem>
                <MenuItem value="medium">Medium Priority</MenuItem>
                <MenuItem value="low">Low Priority</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant={showCompleted ? "contained" : "outlined"}
              onClick={() => setShowCompleted(!showCompleted)}
              size="small"
            >
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </Button>
          </Box>

          {getFilteredChecklist().length === 0 ? (
            <Alert severity="info">
              {checklist.length === 0 
                ? "No care tasks yet. Add tasks to keep track of your healthcare needs."
                : "No tasks match the current filters."
              }
            </Alert>
          ) : (
            <List>
              {getFilteredChecklist().map((item) => (
                <Card key={item._id} sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        checked={item.completed}
                        onChange={() => handleChecklistToggle(item._id)}
                        color="primary"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              textDecoration: item.completed ? 'line-through' : 'none',
                              color: item.completed ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {item.task}
                          </Typography>
                          <Chip
                            label={item.priority}
                            size="small"
                            color={getPriorityColor(item.priority)}
                            variant="outlined"
                          />
                          {item.completed && (
                            <CheckCircle color="success" fontSize="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Provider: {item.providerName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
                          </Typography>
                          {item.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Notes: {item.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </Card>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Providers Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Your Care Providers</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenProviderDialog(true)}
            >
              Add Provider
            </Button>
          </Box>

          <Grid container spacing={3}>
            {careProviders.map((provider) => (
              <Grid item xs={12} md={6} key={provider._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <MedicalServices />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{provider.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {provider.specialty}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ space: 1 }}>
                      {provider.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">{provider.phone}</Typography>
                        </Box>
                      )}
                      {provider.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">{provider.email}</Typography>
                        </Box>
                      )}
                      {provider.address && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <LocationOn fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">{provider.address}</Typography>
                        </Box>
                      )}
                      {provider.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {provider.notes}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Appointments Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ mb: 3 }}>Upcoming Appointments</Typography>
          
          {appointments.length === 0 ? (
            <Alert severity="info">
              No upcoming appointments scheduled.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {appointments.map((appointment) => (
                <Grid item xs={12} md={6} key={appointment.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                          <CalendarToday />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{appointment.provider}</Typography>
                          <Chip 
                            label={appointment.type} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {new Date(appointment.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{appointment.time}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Care Notes Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" sx={{ mb: 3 }}>Care Notes & Instructions</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <MedicalServices sx={{ mr: 1, verticalAlign: 'middle' }} />
                    General Care Instructions
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Daily Medication Schedule"
                        secondary="Take medications at the same time each day for better effectiveness"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Emergency Contacts"
                        secondary="Keep your emergency contact list updated and accessible"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Appointment Preparation"
                        secondary="Prepare questions and bring current medication list to appointments"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="secondary">
                    <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Important Reminders
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Annual Health Screenings"
                        secondary="Schedule yearly physical exams and recommended screenings"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Medication Reviews"
                        secondary="Review all medications with providers every 6 months"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Health Records"
                        secondary="Keep digital copies of important medical records"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">
                    <LocalHospital sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Emergency Preparedness
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Always call 911 or go to the nearest emergency room for medical emergencies
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="error" gutterBottom>
                        When to Seek Emergency Care:
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="• Chest pain or difficulty breathing" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• Severe bleeding or trauma" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• Loss of consciousness" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• Signs of stroke (sudden confusion, numbness)" />
                        </ListItem>
                      </List>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Emergency Kit Essentials:
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="• Current medication list" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• Emergency contact numbers" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• Medical history summary" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• Insurance information" />
                        </ListItem>
                      </List>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Add Provider Dialog */}
      <Dialog open={openProviderDialog} onClose={() => setOpenProviderDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New RPN Provider</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider Name"
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Specialty"
                value={newProvider.specialty}
                onChange={(e) => setNewProvider({ ...newProvider, specialty: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={newProvider.phone}
                onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newProvider.email}
                onChange={(e) => setNewProvider({ ...newProvider, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={newProvider.address}
                onChange={(e) => setNewProvider({ ...newProvider, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={newProvider.notes}
                onChange={(e) => setNewProvider({ ...newProvider, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProviderDialog(false)}>Cancel</Button>
          <Button onClick={handleAddProvider} variant="contained">Add Provider</Button>
        </DialogActions>
      </Dialog>

      {/* Add Checklist Item Dialog */}
      <Dialog open={openChecklistDialog} onClose={() => setOpenChecklistDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New RPN Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Task Description"
                value={newChecklistItem.task}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, task: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Care Provider</InputLabel>
                <Select
                  value={newChecklistItem.providerName}
                  onChange={(e) => setNewChecklistItem({ ...newChecklistItem, providerName: e.target.value })}
                  label="Care Provider"
                >
                  {careProviders.map((provider) => (
                    <MenuItem key={provider._id} value={provider.name}>
                      {provider.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newChecklistItem.priority}
                  onChange={(e) => setNewChecklistItem({ ...newChecklistItem, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={newChecklistItem.dueDate}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenChecklistDialog(false)}>Cancel</Button>
          <Button onClick={handleAddChecklistItem} variant="contained">Add Task</Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default CareProvider;
