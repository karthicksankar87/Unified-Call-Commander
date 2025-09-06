import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import AppLayout from './AppLayout';
import { Phone, AccessTime, Star, People } from '@mui/icons-material';
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
  const performanceMetrics = [
    {
      title: 'Total Calls Today',
      value: '247',
      change: '+12%',
      icon: <Phone fontSize="small" />,
      color: 'primary',
    },
    {
      title: 'Average Handle Time',
      value: '4:32',
      change: '-8%',
      icon: <AccessTime fontSize="small" />,
      color: 'success',
    },
    {
      title: 'Customer Satisfaction',
      value: '94%',
      change: '+2%',
      icon: <Star fontSize="small" />,
      color: 'warning',
    },
    {
      title: 'Active Staff',
      value: '23',
      change: '+5%',
      icon: <People fontSize="small" />,
      color: 'neutral',
    },
  ];

  const locationStats = [
    { location: 'Store #1', calls: 45, avgTime: '4:12', satisfaction: '96%' },
    { location: 'Store #3', calls: 38, avgTime: '4:45', satisfaction: '92%' },
    { location: 'Store #5', calls: 52, avgTime: '3:58', satisfaction: '95%' },
    { location: 'Store #7', calls: 31, avgTime: '5:02', satisfaction: '89%' },
  ];

  const reasonsData = [
    { id: 0, value: 35, name: 'Product Information' },
    { id: 1, value: 28, name: 'Inventory Check' },
    { id: 2, value: 20, name: 'Appointment Booking' },
    { id: 3, value: 17, name: 'Returns/Exchanges' },
  ];

  const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0'];

  return (
    <AppLayout title="Analytics">
      <Typography level="body-md" sx={{ mb: 2 }}>
        Real-time performance metrics and insights across all locations
      </Typography>

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
        {performanceMetrics.map((m, i) => (
          <Card key={i} variant="soft">
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <Sheet
                  variant="solid"
                  color={m.color as any}
                  sx={{ p: 0.5, borderRadius: 'sm' }}
                >
                  {m.icon}
                </Sheet>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  {m.title}
                </Typography>
              </Box>
              <Typography level="h2">{m.value}</Typography>
              <Typography
                level="body-sm"
                sx={{
                  color: m.change.startsWith('+')
                    ? 'success.600'
                    : 'danger.600',
                }}
              >
                {m.change} from yesterday
              </Typography>
            </CardContent>
          </Card>
        ))}
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
                    <th style={{ textAlign: 'right' }}>Total Calls</th>
                    <th style={{ textAlign: 'right' }}>Avg. Handle Time</th>
                    <th style={{ textAlign: 'right' }}>Satisfaction</th>
                  </tr>
                </thead>
                <tbody>
                  {locationStats.map((s) => (
                    <tr key={s.location}>
                      <td>{s.location}</td>
                      <td style={{ textAlign: 'right' }}>{s.calls}</td>
                      <td style={{ textAlign: 'right' }}>{s.avgTime}</td>
                      <td style={{ textAlign: 'right' }}>{s.satisfaction}</td>
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
              Top Call Reasons
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
                    data={reasonsData}
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
                    {reasonsData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.id}`}
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
