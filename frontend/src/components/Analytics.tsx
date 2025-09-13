import React, { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import AppLayout from './AppLayout';
import { Phone, AccessTime, People, CheckCircle } from '@mui/icons-material';
import { apiService, AnalyticsSummary } from '../services/api';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  LabelList,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  ResponsiveContainer,
} from 'recharts';

const AnalyticsJoy: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const formatSeconds = (secs: number | null | undefined): string => {
    if (!secs && secs !== 0) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiService.getAnalyticsSummary();
        setSummary(data);
        setError(null);
      } catch (e) {
        console.error('Failed to load analytics summary', e);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Poll every 10 seconds for near real-time updates
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0'];

  return (
    <AppLayout title="Analytics">
      <Typography level="body-md" sx={{ mb: 2 }}>
        Real-time performance metrics and insights across all locations
      </Typography>

      {loading && (
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
          Loading analytics...
        </Typography>
      )}
      {error && (
        <Typography level="body-sm" sx={{ color: 'danger.600', mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
        }}
      >
        {/* Metric cards */}
        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sheet variant="solid" color="primary" sx={{ p: 0.5, borderRadius: 'sm' }}>
                <Phone fontSize="small" />
              </Sheet>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Total Calls Today
              </Typography>
            </Box>
            <Typography level="h2">{summary?.totalCallsToday ?? '—'}</Typography>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sheet variant="solid" color="success" sx={{ p: 0.5, borderRadius: 'sm' }}>
                <AccessTime fontSize="small" />
              </Sheet>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Average Handle Time (Today)
              </Typography>
            </Box>
            <Typography level="h2">{formatSeconds(summary?.avgHandleTimeSecondsToday)}</Typography>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sheet variant="solid" color="neutral" sx={{ p: 0.5, borderRadius: 'sm' }}>
                <People fontSize="small" />
              </Sheet>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Active Staff (Now)
              </Typography>
            </Box>
            <Typography level="h2">{summary?.activeStaffNow ?? '—'}</Typography>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sheet variant="solid" color="warning" sx={{ p: 0.5, borderRadius: 'sm' }}>
                <CheckCircle fontSize="small" />
              </Sheet>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Completed (Today)
              </Typography>
            </Box>
            <Typography level="h2">{summary?.completedCallsToday ?? '—'}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          mt: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              Location Performance
            </Typography>
            <Sheet variant="soft" sx={{ borderRadius: 'sm' }}>
              <Table aria-label="location performance" size="md">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th style={{ textAlign: 'right' }}>Total Calls (Today)</th>
                    <th style={{ textAlign: 'right' }}>Avg. Handle Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.locationStats || []).map((s) => (
                    <tr key={s.location}>
                      <td>{s.location}</td>
                      <td style={{ textAlign: 'right' }}>{s.callsToday}</td>
                      <td style={{ textAlign: 'right' }}>{formatSeconds(s.avgHandleTimeSecondsToday)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Sheet>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              Top Call Reasons (Today)
            </Typography>
            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <RePieChart>
                  <ReTooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${value}%`,
                      props?.payload?.name,
                    ]}
                  />
                  <ReLegend verticalAlign="bottom" align="center" />
                  <Pie
                    data={(summary?.reasons || []).map((r, idx) => ({ id: idx, name: r.name, value: r.value }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    labelLine
                    // Inside percentage label
                    label={({ percent }: { percent?: number }) =>
                      `${Math.round((percent || 0) * 100)}%`
                    }
                  >
                    {(summary?.reasons || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                    {/* Outside name labels with leader lines */}
                    <LabelList dataKey="name" position="outside" offset={10} />
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
};

export default AnalyticsJoy;
