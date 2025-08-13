import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  LinearProgress,
  Tooltip,
  Button,
  Divider,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Schedule,
  Edit,
  MoreVert,
  CheckCircle,
  Warning,
  Pause,
  PlayArrow,
  Notifications,
  LocalPharmacy,
  AccessTime,
  TrendingUp,
  Delete,
  Stop
} from '@mui/icons-material';

const MedicationCard = ({ medication, onClick, onMarkTaken, onEdit, onDelete, onTogglePause, isPaused = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit(medication);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    onDelete(medication._id);
  };

  const handleTogglePause = () => {
    handleMenuClose();
    onTogglePause(medication._id);
  };
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

  const isDoseDue = () => {
    const nextDose = getNextDoseTime();
    if (!nextDose) return false;
    
    const now = new Date();
    const timeDiff = Math.abs(now - nextDose) / (1000 * 60); // difference in minutes
    return timeDiff <= 5; // Due within 5 minutes
  };

  const isOverdue = () => {
    const nextDose = getNextDoseTime();
    if (!nextDose) return false;
    
    const now = new Date();
    return now > nextDose;
  };

  const nextDose = getNextDoseTime();
  const doseDue = isDoseDue();
  const overdue = isOverdue();
  const adherenceRate = medication.adherence?.adherenceRate || 0;

  const getCardBorderColor = () => {
    if (isPaused) return 'warning.main';
    if (overdue) return 'error.main';
    if (doseDue) return 'warning.main';
    return 'divider';
  };

  const getCardBgColor = () => {
    if (overdue) return 'error.light';
    if (doseDue) return 'warning.light';
    return 'background.paper';
  };

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: 2,
        borderColor: getCardBorderColor(),
        bgcolor: getCardBgColor(),
        borderRadius: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          borderColor: 'primary.main'
        }
      }}
      onClick={() => onClick(medication)}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: medication.color || 'primary.main',
                width: 48,
                height: 48,
                fontSize: '1.3rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <LocalPharmacy />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600, mb: 0.5 }}>
                {medication.commonName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.875rem' }}>
                {medication.scientificName}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        {/* Menu */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleTogglePause}>
            <ListItemIcon>
              {isPaused ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{isPaused ? 'Resume' : 'Pause'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle>Delete Medication</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{medication.commonName}</strong>? 
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Chips */}
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
          {isPaused && (
            <Chip
              icon={<Pause />}
              label="Paused"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
          {overdue && !isPaused && (
            <Chip
              icon={<Warning />}
              label="Overdue"
              size="small"
              color="error"
              sx={{ fontWeight: 500 }}
            />
          )}
          {doseDue && !overdue && !isPaused && (
            <Chip
              icon={<AccessTime />}
              label="Due Now"
              size="small"
              color="warning"
              sx={{ fontWeight: 500 }}
            />
          )}
          {medication.needsRefill && (
            <Chip
              icon={<LocalPharmacy />}
              label="Refill Needed"
              size="small"
              color="error"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
          <Chip
            label={medication.category}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
          />
        </Stack>

        {/* Dosage and Schedule */}
        <Box sx={{ mb: 2.5, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body1" fontWeight="600" color="primary.main">
              {medication.dosage.amount} {medication.dosage.unit}
            </Typography>
            <Chip 
              label={getFrequencyText(medication.schedule.frequency)} 
              size="small" 
              variant="filled" 
              color="secondary"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
          {nextDose && !isPaused && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Schedule fontSize="small" />
              Next dose: {nextDose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
        </Box>

        {/* Adherence Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Adherence Rate
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {Math.round(adherenceRate)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={adherenceRate}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: adherenceRate >= 80 ? 'success.main' : adherenceRate >= 60 ? 'warning.main' : 'error.main'
              }
            }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ mt: 2 }}>
          {(doseDue || overdue) && !isPaused && (
            <Button
              variant="contained"
              size="medium"
              color="success"
              startIcon={<CheckCircle />}
              onClick={(e) => {
                e.stopPropagation();
                onMarkTaken(medication._id);
              }}
              fullWidth
              sx={{ 
                fontWeight: 600,
                py: 1.2,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
              }}
            >
              Mark Taken
            </Button>
          )}
          {!doseDue && !overdue && !isPaused && (
            <Button
              variant="outlined"
              size="medium"
              startIcon={<CheckCircle />}
              onClick={(e) => {
                e.stopPropagation();
                onMarkTaken(medication._id);
              }}
              fullWidth
              sx={{ 
                fontWeight: 600,
                py: 1.2,
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': { borderWidth: 2 }
              }}
            >
              Take Now
            </Button>
          )}
          {isPaused && (
            <Button
              variant="outlined"
              size="medium"
              color="warning"
              startIcon={<PlayArrow />}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePause(medication._id);
              }}
              fullWidth
              sx={{ 
                fontWeight: 600,
                py: 1.2,
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': { borderWidth: 2 }
              }}
            >
              Resume
            </Button>
          )}
        </Box>

        {/* Additional Info */}
        {medication.purpose && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Purpose: {medication.purpose}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicationCard;
