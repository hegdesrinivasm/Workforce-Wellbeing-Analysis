import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Microsoft,
  ChatBubble,
  TableChart,
  GitHub,
  AssignmentTurnedIn,
  CheckCircle,
  Delete,
  Add,
  Settings as SettingsIcon,
  AccountCircle,
  Link as LinkIcon,
} from '@mui/icons-material';
import { IntegrationSelector } from '../components/IntegrationSelector';

interface Integration {
  id: string;
  name: string;
  icon: JSX.Element;
  description: string;
  connected: boolean;
  connectedAt?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    icon: <Microsoft sx={{ fontSize: 40, color: '#0078D4' }} />,
    description: 'Email, Teams, Calendar - Communication and collaboration',
    connected: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: <ChatBubble sx={{ fontSize: 40, color: '#4A154B' }} />,
    description: 'Team messaging and communication',
    connected: false,
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    icon: <TableChart sx={{ fontSize: 40, color: '#0F9D58' }} />,
    description: 'Attendance tracking and data storage',
    connected: false,
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: <AssignmentTurnedIn sx={{ fontSize: 40, color: '#0052CC' }} />,
    description: 'Project management and issue tracking',
    connected: false,
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: <CheckCircle sx={{ fontSize: 40, color: '#F06A6A' }} />,
    description: 'Task and project management',
    connected: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: <GitHub sx={{ fontSize: 40, color: '#181717' }} />,
    description: 'Code repository and collaboration',
    connected: false,
  },
];

export const AccountSettings = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [showIntegrationSelector, setShowIntegrationSelector] = useState(false);
  const [disconnectDialog, setDisconnectDialog] = useState<string | null>(null);

  const handleConnectIntegration = (integrationId: string) => {
    // Open OAuth flow for this specific integration
    const integration = integrations.find(i => i.id === integrationId);
    if (integration) {
      // TODO: Implement actual OAuth flow
      console.log(`Connecting ${integration.name}...`);
      setShowIntegrationSelector(true);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(i =>
        i.id === integrationId
          ? { ...i, connected: false, connectedAt: undefined }
          : i
      )
    );
    setDisconnectDialog(null);
  };

  const connectedIntegrations = integrations.filter(i => i.connected);
  const availableIntegrations = integrations.filter(i => !i.connected);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Account Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your integrations and account preferences
        </Typography>
      </Box>

      {/* Account Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AccountCircle sx={{ fontSize: 60, color: '#667eea' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                User Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                user@example.com
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Integrations
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowIntegrationSelector(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Integration
          </Button>
        </Box>

        {connectedIntegrations.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              You haven't connected any integrations yet. Connect your work tools to enable 
              productivity analytics and wellbeing insights.
            </Typography>
          </Alert>
        )}

        {/* Connected Integrations */}
        {connectedIntegrations.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'success.main' }}>
              ✓ Connected Services ({connectedIntegrations.length})
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 4 }}>
              {connectedIntegrations.map((integration) => (
                <Card key={integration.id} sx={{ border: '2px solid #4caf50' }}>
                  <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {integration.icon}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {integration.name}
                            </Typography>
                            <Chip label="Connected" size="small" color="success" />
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {integration.description}
                          </Typography>
                          {integration.connectedAt && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                              Connected on {integration.connectedAt}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          color="error"
                          onClick={() => setDisconnectDialog(integration.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
              ))}
            </Box>
          </>
        )}

        {/* Available Integrations */}
        {availableIntegrations.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Available Services ({availableIntegrations.length})
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              {availableIntegrations.map((integration) => (
                <Card key={integration.id} sx={{ opacity: 0.8 }}>
                  <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {integration.icon}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {integration.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {integration.description}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => handleConnectIntegration(integration.id)}
                        sx={{ mt: 1 }}
                      >
                        Connect
                      </Button>
                    </CardContent>
                  </Card>
              ))}
            </Box>
          </>
        )}
      </Box>

      {/* Integration Selector Dialog */}
      <IntegrationSelector
        open={showIntegrationSelector}
        onClose={() => setShowIntegrationSelector(false)}
        onComplete={(services) => {
          console.log('Selected services:', services);
          setShowIntegrationSelector(false);
          // TODO: Update connected integrations based on services
        }}
        userRole="member"
      />

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialog !== null}
        onClose={() => setDisconnectDialog(null)}
      >
        <DialogTitle>Disconnect Integration?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect this integration? 
            You'll lose access to analytics data from this service.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialog(null)}>Cancel</Button>
          <Button
            onClick={() => disconnectDialog && handleDisconnect(disconnectDialog)}
            color="error"
            variant="contained"
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
