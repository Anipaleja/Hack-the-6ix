import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Paper,
  Tabs,
  Tab,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Groups,
  PersonAdd,
  Person,
  Email,
  Phone,
  Edit,
  Delete,
  Warning,
  CheckCircle,
  Schedule,
  LocalPharmacy,
  Emergency,
  Share,
  Notifications,
  Security,
  ContentCopy
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const FamilyPage = () => {
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyCode, setFamilyCode] = useState('DEMO123');

  useEffect(() => {
    // Load sample family data
    setFamilyMembers([
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'client',
        status: 'active',
        lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        medicationsCount: 3,
        alertsCount: 0,
        avatar: null
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'next_of_kin',
        status: 'active',
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        medicationsCount: 1,
        alertsCount: 1,
        avatar: null
      },
      {
        id: 3,
        name: 'Dr. Wilson',
        email: 'dr.wilson@example.com',
        role: 'doctor',
        status: 'active',
        lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        medicationsCount: 0,
        alertsCount: 0,
        avatar: null
      }
    ]);
  }, []);

  const handleInvite = () => {
    // Simulate sending invite
    alert(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setInviteDialogOpen(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'primary';
      case 'next_of_kin': return 'secondary';
      case 'client': return 'default';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'doctor': return 'Doctor';
      case 'next_of_kin': return 'Family Member';
      case 'client': return 'Patient';
      default: return role;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(familyCode);
    alert('Family code copied to clipboard!');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Family Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopy />}
            onClick={copyFamilyCode}
          >
            Family Code: {familyCode}
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite Member
          </Button>
        </Box>
      </Box>

      {/* Family Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar sx={{ width: 60, height: 60, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                  <Groups sx={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant="h6">Demo Family</Typography>
                <Typography variant="body2" color="text.secondary">
                  {familyMembers.length} members
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {familyMembers.filter(m => m.status === 'active').length}
                    </Typography>
                    <Typography variant="body2">Active Members</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {familyMembers.reduce((sum, m) => sum + m.alertsCount, 0)}
                    </Typography>
                    <Typography variant="body2">Alerts</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {familyMembers.reduce((sum, m) => sum + m.medicationsCount, 0)}
                    </Typography>
                    <Typography variant="body2">Medications</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {Math.round(Math.random() * 100)}%
                    </Typography>
                    <Typography variant="body2">Adherence</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Members" />
          <Tab label="Alerts" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Members Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Family Members
            </Typography>
            <List>
              {familyMembers.map((member) => (
                <ListItem key={member.id} divider>
                  <ListItemAvatar>
                    <Badge
                      badgeContent={member.alertsCount > 0 ? member.alertsCount : null}
                      color="error"
                    >
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <Person />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{member.name}</Typography>
                        <Chip
                          label={getRoleLabel(member.role)}
                          size="small"
                          color={getRoleColor(member.role)}
                        />
                        <Chip
                          label={member.status}
                          size="small"
                          color={getStatusColor(member.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {member.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last active: {member.lastActive.toLocaleString()}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Chip
                            icon={<LocalPharmacy />}
                            label={`${member.medicationsCount} medications`}
                            size="small"
                            variant="outlined"
                          />
                          {member.alertsCount > 0 && (
                            <Chip
                              icon={<Warning />}
                              label={`${member.alertsCount} alerts`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Send Message">
                      <IconButton edge="end" onClick={() => alert('Message functionality would go here')}>
                        <Email />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Call">
                      <IconButton edge="end" onClick={() => alert('Call functionality would go here')}>
                        <Phone />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Member">
                      <IconButton edge="end" onClick={() => alert('Remove member functionality would go here')}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Alerts Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2">Medication Alert</Typography>
              Jane Smith missed her evening medication dose.
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning color="warning" />
                  Recent Alerts
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Missed Medication"
                      secondary="Jane Smith - Lisinopril - 2 hours ago"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Emergency Contact"
                      secondary="John Doe triggered emergency alert - 1 day ago"
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
                  <CheckCircle color="success" />
                  Resolved Alerts
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Medication Taken"
                      secondary="John Doe took delayed medication - 3 hours ago"
                    />
                  </ListItem>
                </List>
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
                  Notification Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Emergency Alerts"
                      secondary="Receive immediate notifications for emergencies"
                    />
                    <Chip label="Enabled" color="success" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Medication Reminders"
                      secondary="Get notified when family members miss medications"
                    />
                    <Chip label="Enabled" color="success" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Health Data Sharing"
                      secondary="Share health metrics with family members"
                    />
                    <Chip label="Enabled" color="success" size="small" />
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
                  Privacy Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Data Encryption"
                      secondary="All family data is encrypted end-to-end"
                    />
                    <Chip label="Active" color="success" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Access Control"
                      secondary="Members can only see permitted information"
                    />
                    <Chip label="Active" color="success" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Emergency Override"
                      secondary="Doctors can access data in emergencies"
                    />
                    <Chip label="Enabled" color="warning" size="small" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Family Member</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter family member's email"
              sx={{ mb: 2 }}
            />
            <Alert severity="info">
              An invitation will be sent to this email address with instructions to join your family circle.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={!inviteEmail}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FamilyPage;
