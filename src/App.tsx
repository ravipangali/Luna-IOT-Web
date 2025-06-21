import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Dashboard Overview
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { EnhancedLiveTrackingDashboard } from './pages/admin/EnhancedLiveTrackingDashboard';
import IndividualVehicleTracking from './pages/admin/IndividualVehicleTracking';
import { VehicleReportNew } from './pages/admin/VehicleReportNew';

// Views
import { DeviceIndex, DeviceAdd, DeviceEdit, DeviceShow } from './views/device';
import { DeviceModelIndex, DeviceModelAdd, DeviceModelEdit, DeviceModelShow } from './views/device-model';
import { VehicleIndex, VehicleAdd, VehicleEdit, VehicleShow } from './views/vehicle';
import { UserIndex, UserAdd, UserEdit, UserShow } from './views/user';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="live-tracking" element={<EnhancedLiveTrackingDashboard />} />
            <Route path="live-tracking/:imei" element={<IndividualVehicleTracking />} />
            <Route path="reports" element={<VehicleReportNew />} />
            
            {/* Device Routes */}
            <Route path="devices" element={<DeviceIndex />} />
            <Route path="devices/add" element={<DeviceAdd />} />
            <Route path="devices/:id" element={<DeviceShow />} />
            <Route path="devices/:id/edit" element={<DeviceEdit />} />
            
            {/* Device Model Routes */}
            <Route path="device-models" element={<DeviceModelIndex />} />
            <Route path="device-models/add" element={<DeviceModelAdd />} />
            <Route path="device-models/:id" element={<DeviceModelShow />} />
            <Route path="device-models/:id/edit" element={<DeviceModelEdit />} />
            
            {/* Vehicle Routes */}
            <Route path="vehicles" element={<VehicleIndex />} />
            <Route path="vehicles/add" element={<VehicleAdd />} />
            <Route path="vehicles/:imei" element={<VehicleShow />} />
            <Route path="vehicles/:imei/edit" element={<VehicleEdit />} />
            
            {/* User Routes */}
            <Route path="users" element={<UserIndex />} />
            <Route path="users/add" element={<UserAdd />} />
            <Route path="users/:id" element={<UserShow />} />
            <Route path="users/:id/edit" element={<UserEdit />} />
            
            {/* Settings Routes */}
            <Route path="settings" element={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-600 mt-2">Under construction...</p>
              </div>
            } />
          </Route>

          {/* Client Routes - Placeholder */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={
              <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Client Dashboard</h1>
                  <p className="text-gray-600">Welcome to your dashboard</p>
                </div>
              </div>
            } />
            
            {/* Client can view vehicles and devices but not edit */}
            <Route path="vehicles" element={<VehicleIndex />} />
            <Route path="vehicles/:imei" element={<VehicleShow />} />
            <Route path="devices" element={<DeviceIndex />} />
            <Route path="devices/:id" element={<DeviceShow />} />
            <Route path="live-tracking" element={<EnhancedLiveTrackingDashboard />} />
            <Route path="live-tracking/:imei" element={<IndividualVehicleTracking />} />
          </Route>

          {/* Legacy client route redirect */}
          <Route path="/client" element={<Navigate to="/dashboard" replace />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* 404 */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600">Page not found</p>
                </div>
              </div>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
