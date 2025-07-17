import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationService, type Notification } from '../../services/notificationService';

interface NotificationListProps {
  onEdit?: (notification: Notification) => void;
  onDelete?: (id: number) => void;
  onSend?: (id: number) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  onEdit,
  onDelete,
  onSend,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications(page);
      setNotifications(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (notification: Notification) => {
    if (onEdit) {
      onEdit(notification);
    } else {
      navigate(`/admin/notifications/edit/${notification.id}`, {
        state: { notification },
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await notificationService.deleteNotification(id);
        fetchNotifications();
        if (onDelete) onDelete(id);
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    }
  };

  const handleSend = async (id: number) => {
    try {
      await notificationService.sendNotification(id);
      fetchNotifications();
      if (onSend) onSend(id);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleView = (notification: Notification) => {
    setSelectedNotification(notification);
    setViewDialogOpen(true);
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
    return <div>Loading notifications...</div>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          Notifications
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/notifications/create')}
        >
          Create Notification
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <Typography variant="subtitle2" noWrap>
                    {notification.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={notification.type} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={notification.priority}
                    color={getPriorityColor(notification.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={notification.is_sent ? 'Sent' : 'Draft'}
                    color={getStatusColor(notification.is_sent)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {notification.users.length} users
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(notification.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleView(notification)}
                    title="View"
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(notification)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  {!notification.is_sent && (
                    <IconButton
                      size="small"
                      onClick={() => handleSend(notification.id)}
                      title="Send"
                    >
                      <SendIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(notification.id)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Notification Details</DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedNotification.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedNotification.body}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <Chip label={selectedNotification.type} />
                <Chip
                  label={selectedNotification.priority}
                  color={getPriorityColor(selectedNotification.priority)}
                />
                <Chip
                  label={selectedNotification.is_sent ? 'Sent' : 'Draft'}
                  color={getStatusColor(selectedNotification.is_sent)}
                />
              </Box>
              <Typography variant="subtitle2" gutterBottom>
                Recipients ({selectedNotification.users.length}):
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {selectedNotification.users.map((user: { id: number; name: string; phone: string }) => (
                  <Chip
                    key={user.id}
                    label={`${user.name} (${user.phone})`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Typography variant="body2" color="textSecondary" mt={2}>
                Created by: {selectedNotification.creator.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Created: {formatDate(selectedNotification.created_at)}
              </Typography>
              {selectedNotification.sent_at && (
                <Typography variant="body2" color="textSecondary">
                  Sent: {formatDate(selectedNotification.sent_at)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationList; 