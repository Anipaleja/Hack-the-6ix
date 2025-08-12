import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Timeline,
  Upload,
  Add,
  Edit,
  Delete,
  TrendingUp,
  TrendingDown,
  FitnessCenter,
  Favorite,
  Thermostat,
  Scale,
  LocalPharmacy,
  MonitorHeart,
  Bloodtype,
  Speed
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const HealthData = () => {
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [healthData, setHealthData] = useState([]);
  const [newEntry, setNewEntry] = useState({
    type: 'blood_pressure',
    value: '',
    unit: '',
    notes: ''
  });

  const dataTypes = [
    { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: <MonitorHeart /> },
    { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: <Favorite /> },
    { value: 'weight', label: 'Weight', unit: 'lbs', icon: <Scale /> },
    { value: 'temperature', label: 'Temperature', unit: '°F', icon: <Thermostat /> },
    { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: <Bloodtype /> },
    { value: 'exercise', label: 'Exercise', unit: 'minutes', icon: <FitnessCenter /> }
  ];

  useEffect(() => {
    // Load sample health data
    setHealthData([
      {
        id: 1,
        type: 'blood_pressure',
        value: '120/80',
        unit: 'mmHg',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        notes: 'Morning reading'
      },
      {
        id: 2,
        type: 'weight',
        value: '175',
        unit: 'lbs',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        notes: 'After workout'
      },
      {
        id: 3,
        type: 'heart_rate',
        value: '72',
        unit: 'bpm',
        timestamp: new Date(),
        notes: 'Resting heart rate'
      }
    ]);
  }, []);

  const handleAddEntry = () => {
    const entry = {
      id: healthData.length + 1,
      ...newEntry,
      timestamp: new Date()
    };
    setHealthData([...healthData, entry]);
    setNewEntry({ type: 'blood_pressure', value: '', unit: '', notes: '' });
    setOpenDialog(false);
  };

  const getDataTypeIcon = (type) => {
    const dataType = dataTypes.find(dt => dt.value === type);
    return dataType ? dataType.icon : <Timeline />;
  };

  const getDataTypeLabel = (type) => {
    const dataType = dataTypes.find(dt => dt.value === type);
    return dataType ? dataType.label : type;
  };

  const getRecentTrend = (type) => {
    const typeData = healthData.filter(d => d.type === type).slice(-2);
    if (typeData.length < 2) return null;
    
    const current = parseFloat(typeData[1].value.split('/')[0] || typeData[1].value);
    const previous = parseFloat(typeData[0].value.split('/')[0] || typeData[0].value);
    
    return current > previous ? 'up' : current < previous ? 'down' : 'stable';
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Health Data
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => alert('Import health data functionality would go here')}
          >
            Import Data
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Entry
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Trends" />
          <Tab label="All Data" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Quick Stats */}
          {dataTypes.map((dataType, index) => {
            const latestEntry = healthData
              .filter(d => d.type === dataType.value)
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            
            const trend = getRecentTrend(dataType.value);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {dataType.icon}
                      </Avatar>
                      {trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {trend === 'up' ? (
                            <TrendingUp color="success" />
                          ) : trend === 'down' ? (
                            <TrendingDown color="error" />
                          ) : (
                            <Speed color="action" />
                          )}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="h6" component="div">
                      {dataType.label}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                      {latestEntry ? `${latestEntry.value} ${latestEntry.unit}` : 'No data'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {latestEntry ? `Last: ${latestEntry.timestamp.toLocaleDateString()}` : 'Add your first entry'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      {/* Trends Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Trends Analysis
                </Typography>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Timeline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Trend charts and analytics would be displayed here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Connect more data sources to see detailed trends and insights
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* All Data Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Health Entries
            </Typography>
            {healthData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No health data entries yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenDialog(true)}
                  sx={{ mt: 2 }}
                >
                  Add Your First Entry
                </Button>
              </Box>
            ) : (
              <List>
                {healthData
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((entry) => (
                    <ListItem key={entry.id} divider>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                        {getDataTypeIcon(entry.type)}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {getDataTypeLabel(entry.type)}
                            </Typography>
                            <Chip
                              label={`${entry.value} ${entry.unit}`}
                              size="small"
                              color="primary"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {entry.timestamp.toLocaleString()}
                            </Typography>
                            {entry.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Notes: {entry.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => alert('Edit functionality would go here')}>
                          <Edit />
                        </IconButton>
                        <IconButton edge="end" onClick={() => alert('Delete functionality would go here')}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Add Entry Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Health Data Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Data Type"
              value={newEntry.type}
              onChange={(e) => {
                const selectedType = dataTypes.find(dt => dt.value === e.target.value);
                setNewEntry({
                  ...newEntry,
                  type: e.target.value,
                  unit: selectedType?.unit || ''
                });
              }}
              fullWidth
            >
              {dataTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.icon}
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Value"
              value={newEntry.value}
              onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              placeholder={newEntry.type === 'blood_pressure' ? '120/80' : ''}
              fullWidth
            />
            <TextField
              label="Unit"
              value={newEntry.unit}
              onChange={(e) => setNewEntry({ ...newEntry, unit: e.target.value })}
              fullWidth
            />
            <TextField
              label="Notes (Optional)"
              value={newEntry.notes}
              onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddEntry}
            variant="contained"
            disabled={!newEntry.value}
          >
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HealthData;
