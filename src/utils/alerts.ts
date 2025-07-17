// Simple alert utility without external dependencies
export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

// Configuration for different alert types
const ALERT_CONFIG = {
  success: {
    color: '#10B981', // green-500
    icon: '✓',
  },
  error: {
    color: '#EF4444', // red-500
    icon: '✗',
  },
  warning: {
    color: '#F59E0B', // amber-500
    icon: '⚠',
  },
  info: {
    color: '#3B82F6', // blue-500
    icon: 'ℹ',
  },
  question: {
    color: '#6366F1', // indigo-500
    icon: '?',
  },
};

// Basic alert function using browser alert (temporary)
export const showAlert = (
  title: string,
  message?: string,
  type: AlertType = 'info'
): Promise<boolean> => {
  const config = ALERT_CONFIG[type];
  const fullMessage = message ? `${title}\n\n${message}` : title;
  
  // For now using browser alert, will be replaced with SweetAlert2 when dependency is resolved
  alert(`${config.icon} ${fullMessage}`);
  
  return Promise.resolve(true);
};

// Success alert
export const showSuccess = (
  title: string,
  message?: string
): Promise<boolean> => {
  return showAlert(title, message, 'success');
};

// Error alert
export const showError = (
  title: string,
  message?: string
): Promise<boolean> => {
  return showAlert(title, message, 'error');
};

// Warning alert
export const showWarning = (
  title: string,
  message?: string
): Promise<boolean> => {
  return showAlert(title, message, 'warning');
};

// Info alert
export const showInfo = (
  title: string,
  message?: string
): Promise<boolean> => {
  return showAlert(title, message, 'info');
};

// Confirmation dialog
export const showConfirmation = (
  title: string,
  message?: string
): Promise<boolean> => {
  const fullMessage = message ? `${title}\n\n${message}` : title;
  return Promise.resolve(confirm(fullMessage));
};

// Loading alert (placeholder)
export const showLoading = (title: string, message?: string) => {
  console.log(`Loading: ${title}${message ? ` - ${message}` : ''}`);
  return Promise.resolve();
};

// Close loading alert (placeholder)
export const closeLoading = () => {
  console.log('Loading closed');
};

// Toast notification (console log for now)
export const showToast = (
  title: string,
  type: AlertType = 'info',
  duration: number = 3000
): void => {
  const config = ALERT_CONFIG[type];
  console.log(`${config.icon} Toast: ${title} (${type})`);
  
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 2px solid ${config.color};
    color: ${config.color};
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
  `;
  toast.textContent = `${config.icon} ${title}`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, duration);
};

// API Error handler with proper error parsing
export const handleApiError = (error: unknown, defaultMessage: string = 'An error occurred') => {
  let title = 'Error';
  let message = defaultMessage;
  
  // Type guard for axios error
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: Record<string, unknown>; status?: number } };
    
    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      
      // Check for different error response formats
      if (errorData.error && typeof errorData.error === 'string') {
        message = errorData.error;
      } else if (errorData.message && typeof errorData.message === 'string') {
        message = errorData.message;
      } else if (errorData.details && typeof errorData.details === 'string') {
        message = errorData.details;
      } else if (typeof errorData === 'string') {
        message = errorData;
      }
      
      // Set title based on status code
      const status = axiosError.response.status;
      if (status && status >= 400 && status < 500) {
        title = 'Invalid Request';
      } else if (status && status >= 500) {
        title = 'Server Error';
      }
    }
  } else if (error && typeof error === 'object' && 'message' in error) {
    const errorWithMessage = error as { message: string };
    message = errorWithMessage.message;
  }
  
  return showError(title, message);
};

// Device control specific alerts
export const showDeviceControlSuccess = (action: string, deviceName: string) => {
  return showSuccess(
    'Control Command Sent',
    `${action} command has been successfully sent to ${deviceName}.`
  );
};

export const showDeviceControlError = (action: string, deviceName: string, error?: string) => {
  return showError(
    'Control Command Failed',
    `Failed to send ${action} command to ${deviceName}.${error ? ` Error: ${error}` : ''}`
  );
};

// Connection status alerts
export const showConnectionError = () => {
  return showError(
    'Connection Lost',
    'Lost connection to the server. Please check your internet connection and try again.'
  );
};

export const showConnectionRestored = () => {
  return showToast('Connection Restored', 'success', 2000);
};

// Form validation alerts
export const showValidationError = (message: string) => {
  return showWarning('Validation Error', message);
};

// Export all utilities
export default {
  showAlert,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showConfirmation,
  showLoading,
  closeLoading,
  showToast,
  handleApiError,
  showDeviceControlSuccess,
  showDeviceControlError,
  showConnectionError,
  showConnectionRestored,
  showValidationError,
}; 