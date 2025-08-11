import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Autocomplete
} from '@mui/material';
import {
  Close,
  Add,
  Remove,
  Schedule,
  Notifications,
  LocalPharmacy,
  Person
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const AddMedicationDialog = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Basic Info
    scientificName: '',
    commonName: '',
    color: '#1976d2',
    dosage: {
      amount: '',
      unit: 'mg'
    },
    instructions: '',
    purpose: '',
    category: 'prescription',
    sideEffects: [],

    // Schedule
    schedule: {
      frequency: 'once_daily',
      times: [{ hour: 8, minute: 0 }],
      startDate: new Date(),
      endDate: null,
      daysOfWeek: [],
      interval: 1
    },

    // Medical Info
    prescribedBy: {
      doctorName: '',
      prescriptionDate: null,
      prescriptionNumber: ''
    },

    // Inventory
    inventory: {
      totalPills: '',
      remainingPills: '',
      refillReminder: {
        enabled: true,
        threshold: 7
      }
    },

    // Alarm Settings
    alarmSettings: {
      soundEnabled: true,
      vibrationEnabled: true,
      reminderInterval: 5,
      maxReminders: 3,
      notifyFamilyAfter: 15
    }
  });

  const steps = ['Basic Info', 'Schedule', 'Medical Info', 'Settings'];

  const frequencyOptions = [
    { value: 'once_daily', label: 'Once daily', times: 1 },
    { value: 'twice_daily', label: 'Twice daily', times: 2 },
    { value: 'three_times_daily', label: '3 times daily', times: 3 },
    { value: 'four_times_daily', label: '4 times daily', times: 4 },
    { value: 'as_needed', label: 'As needed', times: 0 },
    { value: 'custom', label: 'Custom schedule', times: 0 }
  ];

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const commonMedications = [
    'Aspirin', 'Ibuprofen', 'Acetaminophen', 'Lisinopril', 'Metformin',
    'Atorvastatin', 'Amlodipine', 'Omeprazole', 'Levothyroxine', 'Albuterol'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleFrequencyChange = (frequency) => {
    const selectedFreq = frequencyOptions.find(f => f.value === frequency);
    let defaultTimes = [];

    if (selectedFreq && selectedFreq.times > 0) {
      const intervals = 24 / selectedFreq.times;
      for (let i = 0; i < selectedFreq.times; i++) {
        defaultTimes.push({
          hour: Math.floor(8 + (i * intervals)),
          minute: 0
        });
      }
    }

    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        frequency,
        times: defaultTimes
      }
    }));
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        times: [...prev.schedule.times, { hour: 12, minute: 0 }]
      }
    }));
  };

  const removeTimeSlot = (index) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        times: prev.schedule.times.filter((_, i) => i !== index)
      }
    }));
  };

  const updateTimeSlot = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        times: prev.schedule.times.map((time, i) => 
          i === index ? { ...time, [field]: value } : time
        )
      }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add medication');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFormData({
      scientificName: '',
      commonName: '',
      color: '#1976d2',
      dosage: { amount: '', unit: 'mg' },
      instructions: '',
      purpose: '',
      category: 'prescription',
      sideEffects: [],
      schedule: {
        frequency: 'once_daily',
        times: [{ hour: 8, minute: 0 }],
        startDate: new Date(),
        endDate: null,
        daysOfWeek: [],
        interval: 1
      },
      prescribedBy: {
        doctorName: '',
        prescriptionDate: null,
        prescriptionNumber: ''
      },
      inventory: {
        totalPills: '',
        remainingPills: '',
        refillReminder: { enabled: true, threshold: 7 }
      },
      alarmSettings: {
        soundEnabled: true,
        vibrationEnabled: true,
        reminderInterval: 5,
        maxReminders: 3,
        notifyFamilyAfter: 15
      }
    });
    setError('');
    onClose();
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Autocomplete
          freeSolo
          options={commonMedications}
          value={formData.commonName}
          onChange={(_, newValue) => handleInputChange('commonName', newValue || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Medication Name"
              required
              fullWidth
            />
          )}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Scientific Name"
          value={formData.scientificName}
          onChange={(e) => handleInputChange('scientificName', e.target.value)}
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          label="Dosage Amount"
          type="number"
          value={formData.dosage.amount}
          onChange={(e) => handleNestedInputChange('dosage', 'amount', parseFloat(e.target.value))}
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel>Unit</InputLabel>
          <Select
            value={formData.dosage.unit}
            onChange={(e) => handleNestedInputChange('dosage', 'unit', e.target.value)}
          >
            <MenuItem value="mg">mg</MenuItem>
            <MenuItem value="g">g</MenuItem>
            <MenuItem value="ml">ml</MenuItem>
            <MenuItem value="tablets">tablets</MenuItem>
            <MenuItem value="capsules">capsules</MenuItem>
            <MenuItem value="drops">drops</MenuItem>
            <MenuItem value="puffs">puffs</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          >
            <MenuItem value="prescription">Prescription</MenuItem>
            <MenuItem value="over_the_counter">Over the Counter</MenuItem>
            <MenuItem value="supplement">Supplement</MenuItem>
            <MenuItem value="vitamin">Vitamin</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Purpose/Condition"
          value={formData.purpose}
          onChange={(e) => handleInputChange('purpose', e.target.value)}
          fullWidth
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Instructions"
          value={formData.instructions}
          onChange={(e) => handleInputChange('instructions', e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Take with food, avoid alcohol, etc."
        />
      </Grid>
    </Grid>
  );

  const renderSchedule = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Frequency</InputLabel>
          <Select
            value={formData.schedule.frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
          >
            {frequencyOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {formData.schedule.frequency !== 'as_needed' && (
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Dose Times
          </Typography>
          {formData.schedule.times.map((time, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TextField
                label="Hour"
                type="number"
                value={time.hour}
                onChange={(e) => updateTimeSlot(index, 'hour', parseInt(e.target.value))}
                inputProps={{ min: 0, max: 23 }}
                sx={{ width: 100 }}
              />
              <TextField
                label="Minute"
                type="number"
                value={time.minute}
                onChange={(e) => updateTimeSlot(index, 'minute', parseInt(e.target.value))}
                inputProps={{ min: 0, max: 59 }}
                sx={{ width: 100 }}
              />
              <Typography variant="body2">
                ({String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')})
              </Typography>
              {formData.schedule.times.length > 1 && (
                <IconButton onClick={() => removeTimeSlot(index)} color="error">
                  <Remove />
                </IconButton>
              )}
            </Box>
          ))}
          <Button startIcon={<Add />} onClick={addTimeSlot} variant="outlined" size="small">
            Add Time
          </Button>
        </Grid>
      )}

      <Grid item xs={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={formData.schedule.startDate}
            onChange={(date) => handleNestedInputChange('schedule', 'startDate', date)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="End Date (Optional)"
            value={formData.schedule.endDate}
            onChange={(date) => handleNestedInputChange('schedule', 'endDate', date)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          Days of Week (Leave empty for every day)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {daysOfWeek.map((day) => (
            <Chip
              key={day.value}
              label={day.label}
              onClick={() => {
                const currentDays = formData.schedule.daysOfWeek;
                const newDays = currentDays.includes(day.value)
                  ? currentDays.filter(d => d !== day.value)
                  : [...currentDays, day.value];
                handleNestedInputChange('schedule', 'daysOfWeek', newDays);
              }}
              color={formData.schedule.daysOfWeek.includes(day.value) ? 'primary' : 'default'}
              variant={formData.schedule.daysOfWeek.includes(day.value) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Grid>
    </Grid>
  );

  const renderMedicalInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          label="Prescribing Doctor"
          value={formData.prescribedBy.doctorName}
          onChange={(e) => handleNestedInputChange('prescribedBy', 'doctorName', e.target.value)}
          fullWidth
        />
      </Grid>
      <Grid item xs={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Prescription Date"
            value={formData.prescribedBy.prescriptionDate}
            onChange={(date) => handleNestedInputChange('prescribedBy', 'prescriptionDate', date)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={6}>
        <TextField
          label="Prescription Number"
          value={formData.prescribedBy.prescriptionNumber}
          onChange={(e) => handleNestedInputChange('prescribedBy', 'prescriptionNumber', e.target.value)}
          fullWidth
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          label="Total Pills"
          type="number"
          value={formData.inventory.totalPills}
          onChange={(e) => handleNestedInputChange('inventory', 'totalPills', parseInt(e.target.value))}
          fullWidth
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          label="Current Remaining"
          type="number"
          value={formData.inventory.remainingPills}
          onChange={(e) => handleNestedInputChange('inventory', 'remainingPills', parseInt(e.target.value))}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.inventory.refillReminder.enabled}
              onChange={(e) => handleNestedInputChange('inventory', 'refillReminder', {
                ...formData.inventory.refillReminder,
                enabled: e.target.checked
              })}
            />
          }
          label="Enable Refill Reminders"
        />
      </Grid>
      {formData.inventory.refillReminder.enabled && (
        <Grid item xs={12}>
          <TextField
            label="Remind when days remaining"
            type="number"
            value={formData.inventory.refillReminder.threshold}
            onChange={(e) => handleNestedInputChange('inventory', 'refillReminder', {
              ...formData.inventory.refillReminder,
              threshold: parseInt(e.target.value)
            })}
            fullWidth
          />
        </Grid>
      )}
    </Grid>
  );

  const renderSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Alarm Settings
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.alarmSettings.soundEnabled}
              onChange={(e) => handleNestedInputChange('alarmSettings', 'soundEnabled', e.target.checked)}
            />
          }
          label="Sound Alerts"
        />
      </Grid>
      <Grid item xs={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.alarmSettings.vibrationEnabled}
              onChange={(e) => handleNestedInputChange('alarmSettings', 'vibrationEnabled', e.target.checked)}
            />
          }
          label="Vibration"
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          label="Reminder Interval (min)"
          type="number"
          value={formData.alarmSettings.reminderInterval}
          onChange={(e) => handleNestedInputChange('alarmSettings', 'reminderInterval', parseInt(e.target.value))}
          fullWidth
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          label="Max Reminders"
          type="number"
          value={formData.alarmSettings.maxReminders}
          onChange={(e) => handleNestedInputChange('alarmSettings', 'maxReminders', parseInt(e.target.value))}
          fullWidth
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          label="Notify Family After (min)"
          type="number"
          value={formData.alarmSettings.notifyFamilyAfter}
          onChange={(e) => handleNestedInputChange('alarmSettings', 'notifyFamilyAfter', parseInt(e.target.value))}
          fullWidth
        />
      </Grid>
    </Grid>
  );

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderSchedule();
      case 2:
        return renderMedicalInfo();
      case 3:
        return renderSettings();
      default:
        return null;
    }
  };

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return formData.commonName && formData.scientificName && formData.dosage.amount;
      case 1:
        return formData.schedule.frequency && formData.schedule.startDate;
      case 2:
        return true; // Optional step
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Add New Medication</Typography>
        <IconButton onClick={handleClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card variant="outlined">
          <CardContent>
            {renderStepContent(activeStep)}
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(prev => prev - 1)}
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setActiveStep(prev => prev + 1)}
            disabled={!isStepValid(activeStep)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isStepValid(activeStep) || loading}
          >
            {loading ? 'Adding...' : 'Add Medication'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddMedicationDialog;
