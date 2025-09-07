import React, { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import { Refresh as RefreshIcon, Call as CallIcon, CallEnd as CallEndIcon } from '@mui/icons-material';
import AppLayout from './AppLayout';
import { apiService, Call, CallStats } from '../services/api';

const CallManagementJoy: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCalls();
  }, []);

  const fetchActiveCalls = async () => {
    try {
      setLoading(true);
      const [calls, s] = await Promise.all([
        apiService.getActiveCalls(),
        apiService.getCallStats(),
      ]);
      console.log('Fetched active calls:', calls);
      console.log('Fetched stats:', s);
      setActiveCalls(calls);
      setStats(s);
      setError(null);
    } catch (err) {
      setError('Failed to fetch active calls');
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'incoming':
        return 'warning' as const;
      case 'active':
        return 'success' as const;
      case 'completed':
        return 'neutral' as const;
      default:
        return 'neutral' as const;
    }
  };

  const handleAnswerCall = async (callId: number) => {
    try {
      await apiService.answerCall(callId, 1); // Using user ID 1 for now
      await fetchActiveCalls();
    } catch (err) {
      setError('Failed to answer call');
      console.error('Error answering call:', err);
    }
  };

  const handleEndCall = async (callId: number) => {
    try {
      await apiService.endCall(callId);
      await fetchActiveCalls();
    } catch (err) {
      setError('Failed to end call');
      console.error('Error ending call:', err);
    }
  };

  const handleRefresh = async () => {
    await fetchActiveCalls();
  };


  if (loading) {
    return (
      <AppLayout title="Call Management">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Typography level="body-md">Loading calls...</Typography>
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Call Management">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 1 }}>
          <Typography level="body-md" sx={{ color: 'danger.600' }}>{error}</Typography>
          <Button variant="solid" onClick={fetchActiveCalls}>Retry</Button>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Call Management">
      <Typography level="body-md" sx={{ mb: 2 }}>
        Monitor and manage incoming calls across all locations
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        {/* Active Calls */}
        <Card variant="outlined">
          <CardContent>
            <Typography level="title-md" gutterBottom>
              Active Calls
            </Typography>
            <Sheet variant="soft" sx={{ borderRadius: 'sm' }}>
              <Table
                aria-label="active calls table"
                size="md"
                sx={{ '--TableCell-paddingY': '12px', '--TableCell-paddingX': '12px' }}
              >
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>Caller</th>
                    <th style={{ width: 220 }}>Location</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCalls.map((call) => (
                    <tr key={call.id}>
                      <td>{call.callerName || call.customer?.name || call.phoneNumber}</td>
                      <td>{call.user?.location?.name || call.routedTo || 'Unassigned'}</td>
                      <td>
                        <Chip size="sm" color={getStatusColor(call.status)}>
                          {call.status}
                        </Chip>
                      </td>
                      <td>{new Date(call.timestamp).toLocaleTimeString()}</td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {call.status === 'incoming' && (
                            <Button
                              size="sm"
                              variant="solid"
                              color="success"
                              startDecorator={<CallIcon fontSize="small" />}
                              onClick={() => handleAnswerCall(call.id)}
                            >
                              Answer
                            </Button>
                          )}
                          {call.status === 'active' && (
                            <Button
                              size="sm"
                              variant="solid"
                              color="danger"
                              startDecorator={<CallEndIcon fontSize="small" />}
                              onClick={() => handleEndCall(call.id)}
                            >
                              End
                            </Button>
                          )}
                        </Box>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Sheet>
          </CardContent>
        </Card>

        {/* Controls & Stats */}
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Card>
            <CardContent>
              <Typography level="title-md" gutterBottom>
                Call Controls
              </Typography>
              <Button fullWidth variant="solid" startDecorator={<RefreshIcon />} onClick={handleRefresh}>
                Refresh Calls
              </Button>
            </CardContent>
          </Card>

          <Card variant="soft">
            <CardContent>
              <Typography level="title-md" gutterBottom>
                Today's Stats
              </Typography>
              <Typography level="body-sm">Total Calls: {stats?.totalCalls ?? '—'}</Typography>
              <Typography level="body-sm">Active: {stats?.activeCalls ?? '—'}</Typography>
              <Typography level="body-sm">Completed: {stats?.completedCalls ?? '—'}</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </AppLayout>
  );
};

export default CallManagementJoy;
