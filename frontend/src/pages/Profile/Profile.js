import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Paper,
  Tabs,
  Tab,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  Phone,
  Email,
  LocationOn,
  Security,
  Notifications,
  HealthAndSafety,
  Add,
  Delete,
  Badge
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const Profile = () => {
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || 'Demo',
    lastName: user?.lastName || 'User',
    email: user?.email || 'demo@example.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: '1990-01-15',
    address: '123 Health St, Wellness City, WC 12345',
    emergencyContact: 'Jane Doe - (555) 987-6543',
    bloodType: 'O+',
    height: '5\'10"',
    weight: '175 lbs'
  });
  
  const [medicalInfo, setMedicalInfo] = useState({
    allergies: ['Penicillin', 'Shellfish'],
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    medications: ['Lisinopril 10mg', 'Metformin 500mg'],
    surgeries: ['Appendectomy (2015)']
  });

  const [notifications, setNotifications] = useState({
    medication: true,
    healthAlerts: true,
    familyUpdates: true,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false
  });

  const handleSave = () => {
    // Simulate saving profile
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values if needed
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
          Profile
        </Typography>
        <Button
          variant={isEditing ? "outlined" : "contained"}
          startIcon={isEditing ? <Cancel /> : <Edit />}
          onClick={isEditing ? handleCancel : () => setIsEditing(true)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </Box>

      {/* Profile Header Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" gutterBottom>
                {profileData.firstName} {profileData.lastName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip icon={<Email />} label={profileData.email} variant="outlined" />
                <Chip icon={<Phone />} label={profileData.phone} variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Patient ID: {user?._id?.slice(-8) || 'DEMO1234'}
              </Typography>
            </Grid>
            <Grid item>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {Math.floor((new Date() - new Date(profileData.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))}
                </Typography>
                <Typography variant="body2">Years Old</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Personal Info" />
          <Tab label="Medical Info" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Personal Info Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                  />
                  <TextField
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                  />
                  <TextField
                    label="Email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                  />
                  <TextField
                    label="Phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                  />
                  <TextField
                    label="Date of Birth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                {isEditing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                      Save Changes
                    </Button>
                    <Button variant="outlined" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contact & Emergency
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    disabled={!isEditing}
                    multiline
                    rows={2}
                    fullWidth
                  />
                  <TextField
                    label="Emergency Contact"
                    value={profileData.emergencyContact}
                    onChange={(e) => setProfileData({...profileData, emergencyContact: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                  />
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Physical Information
                  </Typography>
                  <TextField
                    label="Blood Type"
                    value={profileData.bloodType}
                    onChange={(e) => setProfileData({...profileData, bloodType: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Height"
                        value={profileData.height}
                        onChange={(e) => setProfileData({...profileData, height: e.target.value})}
                        disabled={!isEditing}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Weight"
                        value={profileData.weight}
                        onChange={(e) => setProfileData({...profileData, weight: e.target.value})}
                        disabled={!isEditing}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Medical Info Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HealthAndSafety color="error" />
                  Allergies
                </Typography>
                <List>
                  {medicalInfo.allergies.map((allergy, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={allergy} />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => alert('Remove allergy functionality')}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                <Button startIcon={<Add />} onClick={() => alert('Add allergy functionality')}>
                  Add Allergy
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HealthAndSafety color="warning" />
                  Medical Conditions
                </Typography>
                <List>
                  {medicalInfo.conditions.map((condition, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={condition} />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => alert('Remove condition functionality')}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                <Button startIcon={<Add />} onClick={() => alert('Add condition functionality')}>
                  Add Condition
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Medical History
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Current Medications
                    </Typography>
                    <List dense>
                      {medicalInfo.medications.map((medication, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={medication} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Past Surgeries
                    </Typography>
                    <List dense>
                      {medicalInfo.surgeries.map((surgery, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={surgery} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Settings Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Notifications color="primary" />
                  Notification Preferences
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Medication Reminders"
                      secondary="Get notified when it's time to take medications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.medication}
                          onChange={(e) => setNotifications({...notifications, medication: e.target.checked})}
                        />
                      }
                      label=""
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Health Alerts"
                      secondary="Receive important health-related notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.healthAlerts}
                          onChange={(e) => setNotifications({...notifications, healthAlerts: e.target.checked})}
                        />
                      }
                      label=""
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Family Updates"
                      secondary="Get notifications about family members"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.familyUpdates}
                          onChange={(e) => setNotifications({...notifications, familyUpdates: e.target.checked})}
                        />
                      }
                      label=""
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color="primary" />
                  Privacy & Security
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Two-Factor Authentication"
                      secondary="Add an extra layer of security to your account"
                    />
                    <Chip label="Not Set Up" color="warning" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Data Sharing"
                      secondary="Control how your health data is shared"
                    />
                    <Button variant="outlined" size="small">
                      Manage
                    </Button>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Account Security"
                      secondary="Change password and security settings"
                    />
                    <Button variant="outlined" size="small">
                      Settings
                    </Button>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default Profile;
