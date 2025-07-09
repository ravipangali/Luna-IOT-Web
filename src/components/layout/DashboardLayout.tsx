import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faCar, 
  faMobile, 
  faUsers, 
  faCog, 
  faSignOutAlt,
  faChartLine,
  faMapMarkerAlt,
  faClipboardList,
  faMicrochip
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: faHome },
  { name: 'Live Tracking', href: '/admin/live-tracking', icon: faMapMarkerAlt },
  { name: 'Reports', href: '/admin/reports', icon: faClipboardList },
  { name: 'Devices', href: '/admin/devices', icon: faMobile },
  { name: 'Device Models', href: '/admin/device-models', icon: faMicrochip },
  { name: 'All Vehicles', href: '/admin/vehicles', icon: faCar },
  { name: 'Users', href: '/admin/users', icon: faUsers },
  { name: 'Settings', href: '/admin/settings', icon: faCog },
];

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-xl border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-700">
            <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-white mr-3" />
            <h1 className="text-lg font-bold text-white">Luna IoT</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  `w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-green-50 text-green-700 border-l-4 border-green-600 font-medium shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <FontAwesomeIcon 
                  icon={item.icon} 
                  className={`w-4 h-4 mr-3`} 
                />
                <span className="text-sm">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User & Logout */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center px-3 py-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Administrator'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-60">
        <Outlet />
      </div>
    </div>
  );
}; 