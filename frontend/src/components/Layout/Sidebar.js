import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  Medication,
  Timeline,
  Psychology,
  Groups,
  Person,
  Settings,
  LocalHospital,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

const drawerWidth = 260;

const menuItems = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    text: 'Medications',
    icon: <Medication />,
    path: '/medications',
  },
  {
    text: 'Health Data',
    icon: <Timeline />,
    path: '/health-data',
  },
  {
    text: 'AI Assistant',
    icon: <Psychology />,
    path: '/ai-assistant',
  },
  {
    text: 'Care Provider',
    icon: <LocalHospital />,
    path: '/care-provider',
  },
  {
    text: 'Family',
    icon: <Groups />,
    path: '/family',
  },
];

const bottomMenuItems = [
  {
    text: 'Profile',
    icon: <Person />,
    path: '/profile',
  },
  {
    text: 'Settings',
    icon: <Settings />,
    path: '/settings',
  },
];

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const isActive = (path) => location.pathname === path;

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <img 
            src={logo} 
            alt="Vivirion Logo" 
            style={{ 
              width: 48,
              height: 48,
              marginRight: 12,
              objectFit: 'contain'
            }} 
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #16a34a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Vivirion
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.875rem' }}
        >
          Your Health Companion
        </Typography>
      </Box>

      <Divider />

      {/* Main navigation */}
      <Box sx={{ flex: 1, py: 1 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* Bottom navigation */}
      <Box sx={{ py: 1 }}>
        <List>
          {bottomMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
