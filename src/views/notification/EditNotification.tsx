import React from 'react';
import { useParams } from 'react-router-dom';
import NotificationForm from './NotificationForm';

const EditNotification: React.FC = () => {
  const params = useParams<{ id: string }>();
  const notificationId = params.id ? parseInt(params.id) : undefined;

  return <NotificationForm isEdit={true} notificationId={notificationId} />;
};

export default EditNotification; 