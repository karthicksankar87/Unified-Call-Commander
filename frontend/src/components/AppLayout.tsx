import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Typography from '@mui/joy/Typography';
import Box from '@mui/joy/Box';
import Divider from '@mui/joy/Divider';
import IconButton from '@mui/joy/IconButton';
import { useColorScheme } from '@mui/joy/styles';
import {
  Dashboard as DashboardIcon,
  Phone as PhoneIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

type AppLayoutProps = {
  title?: string;
  children: React.ReactNode;
};

const AppLayout: React.FC<AppLayoutProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useColorScheme();
  const menu = [
    { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/' },
    { label: 'Calls', icon: <PhoneIcon fontSize="small" />, path: '/calls' },
    {
      label: 'Analytics',
      icon: <AnalyticsIcon fontSize="small" />,
      path: '/analytics',
    },
    {
      label: 'Settings',
      icon: <SettingsIcon fontSize="small" />,
      path: '/settings',
    },
  ];

  // Persist and restore theme selection
  useEffect(() => {
    const saved = localStorage.getItem('app-color-scheme');
    if (saved === 'light' || saved === 'dark') {
      setMode(saved);
    } else {
      // default to light if previously 'system' or unset
      setMode('light');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'light' || mode === 'dark') {
      localStorage.setItem('app-color-scheme', mode);
    } else if (mode) {
      // never persist 'system' anymore
      localStorage.setItem('app-color-scheme', 'light');
    }
  }, [mode]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.body',
        transition: 'background-color 200ms ease, color 200ms ease',
      }}
    >
      {/* Sidebar */}
      <Sheet
        variant="soft"
        sx={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: drawerWidth,
          p: 2,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          transition:
            'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            px: 1,
            py: 1,
          }}
        >
          <Typography level="title-lg">Call Commander</Typography>
        </Box>
        <Divider />
        <List sx={{ mt: 1 }}>
          {menu.map((m) => (
            <ListItem key={m.label}>
              <ListItemButton
                variant={isActive(m.path) ? 'soft' : 'plain'}
                color={isActive(m.path) ? 'primary' : 'neutral'}
                onClick={() => navigate(m.path)}
              >
                {m.icon}
                <ListItemContent>
                  <Typography level="body-md" sx={{ ml: 1 }}>
                    {m.label}
                  </Typography>
                </ListItemContent>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
      </Sheet>

      {/* Main */}
      <Box
        component="main"
        sx={{
          ml: `${drawerWidth}px`,
          flex: 1,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 200ms ease, color 200ms ease',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          {title ? <Typography level="h3">{title}</Typography> : <span />}
          <IconButton
            variant="outlined"
            color="neutral"
            size="sm"
            aria-label="Toggle light/dark mode"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          >
            {mode === 'dark' ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
