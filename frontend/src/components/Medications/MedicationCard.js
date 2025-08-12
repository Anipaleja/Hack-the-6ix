import React from 'react';
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
  Stack
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
  TrendingUp
} from '@mui/icons-material';

const MedicationCard = ({ medication, onClick, onMarkTaken, isPaused = false }) => {
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
        transition: 'all 0.2s',
        border: 2,
        borderColor: getCardBorderColor(),
        bgcolor: getCardBgColor(),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
      onClick={() => onClick(medication)}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: medication.color || 'primary.main',
                width: 40,
                height: 40,
                fontSize: '1.2rem'
              }}
            >
              <LocalPharmacy />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" noWrap>
                {medication.commonName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {medication.scientificName}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); }}>
            <MoreVert />
          </IconButton>
        </Box>

        {/* Status Chips */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {isPaused && (
            <Chip
              icon={<Pause />}
              label="Paused"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {overdue && !isPaused && (
            <Chip
              icon={<Warning />}
              label="Overdue"
              size="small"
              color="error"
            />
          )}
          {doseDue && !overdue && !isPaused && (
            <Chip
              icon={<AccessTime />}
              label="Due Now"
              size="small"
              color="warning"
            />
          )}
          {medication.needsRefill && (
            <Chip
              icon={<LocalPharmacy />}
              label="Refill Needed"
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Stack>

        {/* Dosage and Schedule */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="medium">
            {medication.dosage.amount} {medication.dosage.unit}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getFrequencyText(medication.schedule.frequency)}
          </Typography>
          {nextDose && !isPaused && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Schedule fontSize="small" />
              Next: {nextDose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(doseDue || overdue) && !isPaused && (
            <Button
              variant="contained"
              size="small"
              color="success"
              startIcon={<CheckCircle />}
              onClick={(e) => {
                e.stopPropagation();
                onMarkTaken(medication._id);
              }}
              fullWidth
            >
              Mark Taken
            </Button>
          )}
          {!doseDue && !overdue && !isPaused && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CheckCircle />}
              onClick={(e) => {
                e.stopPropagation();
                onMarkTaken(medication._id);
              }}
              fullWidth
            >
              Take Now
            </Button>
          )}
          {isPaused && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PlayArrow />}
              onClick={(e) => {
                e.stopPropagation();
                // Handle resume medication
              }}
              fullWidth
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
