import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Switch from '@mui/joy/Switch';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import AppLayout from './AppLayout';
import { Save as SaveIcon } from '@mui/icons-material';

const SettingsJoy: React.FC = () => {
  return (
    <AppLayout title="Settings">
      <Typography level="body-md" sx={{ mb: 2 }}>
        Configure your Call Commander system settings
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {/* General Settings */}
        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              General Settings
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Organization Name</FormLabel>
              <Input placeholder="Multi-Location Retail Corp" defaultValue="Multi-Location Retail Corp" />
            </FormControl>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Timezone</FormLabel>
              <Select defaultValue="EST">
                <Option value="EST">Eastern Time</Option>
                <Option value="CST">Central Time</Option>
                <Option value="MST">Mountain Time</Option>
                <Option value="PST">Pacific Time</Option>
              </Select>
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 1, alignItems: 'center', gap: 1 }}>
              <Switch defaultChecked />
              <FormLabel>Enable real-time notifications</FormLabel>
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 2, alignItems: 'center', gap: 1 }}>
              <Switch defaultChecked />
              <FormLabel>Auto-sync customer data</FormLabel>
            </FormControl>

            <Button variant="solid" startDecorator={<SaveIcon />}>
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Call Routing Settings */}
        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              Call Routing
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Default Routing Strategy</FormLabel>
              <Select defaultValue="availability">
                <Option value="availability">Staff Availability</Option>
                <Option value="expertise">Staff Expertise</Option>
                <Option value="location">Location Priority</Option>
                <Option value="round-robin">Round Robin</Option>
              </Select>
            </FormControl>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Maximum Ring Time (seconds)</FormLabel>
              <Input type="number" defaultValue="30" />
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 1, alignItems: 'center', gap: 1 }}>
              <Switch defaultChecked />
              <FormLabel>Enable intelligent routing</FormLabel>
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 2, alignItems: 'center', gap: 1 }}>
              <Switch defaultChecked />
              <FormLabel>Allow call transfers</FormLabel>
            </FormControl>

            <Button variant="solid" startDecorator={<SaveIcon />}>
              Save Routing
            </Button>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              Third-Party Integrations
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Twilio API Key</FormLabel>
              <Input type="password" placeholder="Enter your Twilio API key" />
            </FormControl>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Shopify Store URL</FormLabel>
              <Input placeholder="your-store.myshopify.com" />
            </FormControl>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>CRM API Endpoint</FormLabel>
              <Input placeholder="https://api.crm.com/webhook" />
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 1, alignItems: 'center', gap: 1 }}>
              <Switch />
              <FormLabel>Enable inventory sync</FormLabel>
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 2, alignItems: 'center', gap: 1 }}>
              <Switch defaultChecked />
              <FormLabel>Sync customer data</FormLabel>
            </FormControl>

            <Button variant="solid" startDecorator={<SaveIcon />}>
              Test Connections
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardContent>
            <Typography level="title-md" gutterBottom>
              User Management
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Default User Role</FormLabel>
              <Select defaultValue="staff">
                <Option value="admin">Administrator</Option>
                <Option value="manager">Manager</Option>
                <Option value="staff">Staff</Option>
              </Select>
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 1, alignItems: 'center', gap: 1 }}>
              <Switch defaultChecked />
              <FormLabel>Require two-factor authentication</FormLabel>
            </FormControl>

            <FormControl orientation="horizontal" sx={{ mb: 2, alignItems: 'center', gap: 1 }}>
              <Switch />
              <FormLabel>Allow self-registration</FormLabel>
            </FormControl>

            <Button variant="solid" startDecorator={<SaveIcon />}>
              Save User Settings
            </Button>
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
};

export default SettingsJoy;
