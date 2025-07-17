import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import type { Notification } from '../../services/notificationService';

const NotificationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadNotification();
    }
  }, [id]);

  const loadNotification = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotification(parseInt(id!));
      if (response.success) {
        setNotification(response.data);
      } else {
        setError('Failed to load notification');
      }
    } catch (error) {
      setError('Failed to load notification');
      console.error('Error loading notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      const response = await notificationService.sendNotification(parseInt(id!));
      if (response.success) {
        setSuccess('Notification sent successfully');
        loadNotification(); // Reload to update status
      } else {
        setError(response.message || 'Failed to send notification');
      }
    } catch (error) {
      setError('Failed to send notification');
      console.error('Error sending notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const response = await notificationService.deleteNotification(parseInt(id!));
      if (response.success) {
        navigate('/admin/notifications');
      } else {
        setError(response.message || 'Failed to delete notification');
      }
    } catch (error) {
      setError('Failed to delete notification');
      console.error('Error deleting notification:', error);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority: string): 'error' | 'primary' | 'default' => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'normal':
        return 'primary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (isSent: boolean): 'success' | 'warning' => {
    return isSent ? 'success' : 'warning';
  };

  if (loading) {
    return <div>Loading notification...</div>;
  }

  if (error && !notification) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/notifications')}
          sx={{ mt: 2 }}
        >
          Back to Notifications
        </Button>
      </Box>
    );
  }

  if (!notification) {
    return <div>Notification not found</div>;
  }

  return (
    <Box maxWidth="800px" mx="auto" p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/notifications')}
        >
          Back to Notifications
        </Button>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/admin/notifications/edit/${notification.id}`)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          {!notification.is_sent && (
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSend}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Send
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {notification.title}
        </Typography>

        <Box display="flex" gap={1} mb={3}>
          <Chip label={notification.type} />
          <Chip
            label={notification.priority}
            color={getPriorityColor(notification.priority)}
          />
          <Chip
            label={notification.is_sent ? 'Sent' : 'Draft'}
            color={getStatusColor(notification.is_sent)}
          />
        </Box>

        <Typography variant="body1" paragraph>
          {notification.body}
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Notification Details
            </Typography>
            <Box>
              <Typography variant="body2" color="textSecondary">
                <strong>Type:</strong> {notification.type}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Priority:</strong>
                <Chip
                  label={notification.priority}
                  color={getPriorityColor(notification.priority)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Status:</strong>
                <Chip
                  label={notification.is_sent ? 'Sent' : 'Pending'}
                  color={getStatusColor(notification.is_sent)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Created:</strong> {formatDate(notification.created_at)}
              </Typography>
              {notification.sent_at && (
                <Typography variant="body2" color="textSecondary">
                  <strong>Sent:</strong> {formatDate(notification.sent_at)}
                </Typography>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recipients ({notification.users.length})
            </Typography>
            <List dense>
              {notification.users.map((user) => (
                <ListItem key={user.id}>
                  <ListItemAvatar>
                    <Avatar>{user.name.charAt(0).toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={user.phone}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </div>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this notification? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationDetail; 