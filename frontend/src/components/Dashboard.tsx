import React, { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import { CallReceived as CallReceivedIcon, PhoneInTalk as PhoneInTalkIcon, CheckCircle as CheckCircleIcon, Storefront as StorefrontIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import { apiService, CallStats } from '../services/api';

const DashboardJoy: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CallStats>({ totalCalls: 0, activeCalls: 0, completedCalls: 0 });
  const [incomingCount, setIncomingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [s, activeCalls] = await Promise.all([
          apiService.getCallStats(),
          apiService.getActiveCalls(),
        ]);
        setStats(s);
        setIncomingCount(activeCalls.filter((c) => c.status === 'incoming').length);
        setError(null);
      } catch (e) {
        console.error(e);
        setError('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AppLayout title="Dashboard">
      <Typography level="body-md" sx={{ mb: 2 }}>
        Unified communications platform for multi-location retailers
      </Typography>

      {/* Row 1: Four Stat Cards */}
      <Box sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
      }}>
        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>Total Calls (Today)</Typography>
                <Typography level="h2">{stats.totalCalls}</Typography>
              </Box>
              <CallReceivedIcon color="primary" />
            </Box>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>Active Calls (Now)</Typography>
                <Typography level="h2">{stats.activeCalls}</Typography>
              </Box>
              <PhoneInTalkIcon color="success" />
            </Box>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>Completed (Today)</Typography>
                <Typography level="h2">{stats.completedCalls}</Typography>
              </Box>
              <CheckCircleIcon color="action" />
            </Box>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>Incoming (Queue)</Typography>
                <Typography level="h2">{incomingCount}</Typography>
              </Box>
              <StorefrontIcon color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Row 2: Actions */}
      <Box sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        mt: 3,
      }}>
        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              Manage Calls
            </Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
              Monitor, answer, and complete calls across locations.
            </Typography>
            <Button variant="solid" onClick={() => navigate('/calls')}>
              Go to Call Management
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              View Analytics
            </Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
              Explore trends and KPIs to optimize performance.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/analytics')}>
              Open Analytics
            </Button>
          </CardContent>
        </Card>
      </Box>

      {loading && (
        <Typography level="body-sm" sx={{ mt: 2, color: 'text.tertiary' }}>
          Loading dashboard metrics...
        </Typography>
      )}
      {error && (
        <Typography level="body-sm" sx={{ mt: 2, color: 'danger.600' }}>
          {error}
        </Typography>
      )}
    </AppLayout>
  );
};

export default DashboardJoy;
