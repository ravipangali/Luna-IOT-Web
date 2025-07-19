import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faSpinner,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { apiService } from '../../services/apiService';

interface BackendNotificationSenderProps {
  notificationId?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

const BackendNotificationSender: React.FC<BackendNotificationSenderProps> = ({
  notificationId,
  onSuccess,
  onError
}) => {
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);

  const handleSendNotification = async () => {
    if (!notificationId) {
      toast.error('No notification ID provided');
      onError?.('No notification ID provided');
      return;
    }

    setIsSending(true);

    try {
      const response = await apiService.post<ApiResponse>(`/api/v1/admin/notification-management/${notificationId}/send`, {});

      if (response.success) {
        toast.success('Notification sent successfully via backend!');
        onSuccess?.();
      } else {
        toast.error(response.error || 'Failed to send notification');
        onError?.(response.error || 'Failed to send notification');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleTestRavipangaliAPI = async () => {
    setIsSending(true);

    try {
      const response = await apiService.post<ApiResponse>('/api/v1/admin/notification-management/test-ravipangali', {});

      if (response.success) {
        toast.success('Ravipangali API test successful!');
        setTestResult(response.data as Record<string, unknown>);
      } else {
        toast.error(response.error || 'Ravipangali API test failed');
        setTestResult({ error: response.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ravipangali API test failed';
      toast.error(errorMessage);
      setTestResult({ error: errorMessage });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <FontAwesomeIcon icon={faPaperPlane} className="text-blue-600 mr-3 text-xl" />
        <h2 className="text-2xl font-bold text-gray-800">Backend Notification Sender</h2>
      </div>

      <div className="space-y-6">
        {/* Test Ravipangali API */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Test Ravipangali API</h3>
          <p className="text-sm text-gray-600 mb-4">
            Test the Ravipangali API integration with your backend credentials.
          </p>
          <button
            onClick={handleTestRavipangaliAPI}
            disabled={isSending}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
              isSending
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isSending ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Testing...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Test Ravipangali API
              </>
            )}
          </button>

          {/* Test Results */}
          {testResult && (
            <div className="mt-4 p-3 rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Test Results:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Send Notification by ID */}
        {notificationId && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Send Notification</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send notification ID: <strong>{notificationId}</strong> via backend to Ravipangali API.
            </p>
            <button
              onClick={handleSendNotification}
              disabled={isSending}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
                isSending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSending ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        )}

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faCheckCircle} className="text-blue-600 mt-1 mr-3" />
            <div>
              <h4 className="font-medium text-blue-800">Backend-Driven Architecture</h4>
              <p className="text-sm text-blue-700 mt-1">
                This implementation sends notifications through your backend, which then calls the Ravipangali API. 
                This keeps your API credentials secure and provides better error handling and logging.
              </p>
            </div>
          </div>
        </div>

        {/* Environment Variables Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-1 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">Required Environment Variables</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Make sure these are set in your backend .env file:
              </p>
              <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                <li>• <code>RP_FIREBASE_APP_ID</code> - Your Firebase app ID</li>
                <li>• <code>RP_ACCOUNT_EMAIL</code> - Your Ravipangali account email</li>
                <li>• <code>RP_ACCOUNT_PASSWORD</code> - Your Ravipangali account password</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendNotificationSender; 