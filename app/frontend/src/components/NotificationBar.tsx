import { 
  Box, 
  IconButton, 
  Badge, 
  Menu, 
  MenuItem, 
  Typography, 
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { 
  Notifications, 
  Info, 
  Warning, 
  Error as ErrorIcon,
  CheckCircle,
  Delete,
} from '@mui/icons-material';
import { useState } from 'react';

interface Notification {
  id: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
}

export const NotificationBar = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    // Empty by default - can be populated later
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Mark all as read when opened
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon sx={{ color: '#e74c3c', fontSize: 20 }} />;
      case 'warning':
        return <Warning sx={{ color: '#f39c12', fontSize: 20 }} />;
      case 'success':
        return <CheckCircle sx={{ color: '#2ecc71', fontSize: 20 }} />;
      default:
        return <Info sx={{ color: '#3498db', fontSize: 20 }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      case 'success':
        return '#2ecc71';
      default:
        return '#3498db';
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'white',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #ecf0f1' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
            {notifications.length === 0 
              ? 'No notifications' 
              : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
          </Typography>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Notifications sx={{ fontSize: 48, color: '#bdc3c7', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <ListItem
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    py: 2,
                    px: 2,
                    bgcolor: notification.read ? 'transparent' : '#f8f9fa',
                    borderLeft: `3px solid ${getSeverityColor(notification.severity)}`,
                    '&:hover': {
                      bgcolor: '#f8f9fa',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 'auto', mt: 0.5 }}>
                    {getSeverityIcon(notification.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.message}
                    secondary={notification.timestamp}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { fontWeight: notification.read ? 400 : 600 },
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { color: '#7f8c8d' },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(notification.id)}
                    sx={{
                      color: '#95a5a6',
                      '&:hover': {
                        color: '#e74c3c',
                        bgcolor: '#e74c3c15',
                      },
                    }}
                  >
                    <Delete sx={{ fontSize: 18 }} />
                  </IconButton>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <MenuItem
              onClick={() => {
                setNotifications([]);
                handleClose();
              }}
              sx={{
                justifyContent: 'center',
                color: '#e74c3c',
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Clear All
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};
