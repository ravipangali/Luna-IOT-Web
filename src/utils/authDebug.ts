import { authService } from '../services/authService';

export function debugAuthState() {
  const token = authService.getToken();
  const user = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  
  console.log('🔍 Authentication Debug Info:');
  console.log('  Token exists:', !!token);
  console.log('  Token length:', token?.length || 0);
  console.log('  User exists:', !!user);
  console.log('  User role:', user?.role);
  console.log('  Is authenticated:', isAuthenticated);
  console.log('  Is admin:', isAdmin);
  console.log('  Session storage keys:', Object.keys(sessionStorage));
  console.log('  Local storage keys:', Object.keys(localStorage));
  
  // Check for token in different storage locations
  const sessionToken = sessionStorage.getItem('luna_auth_token');
  const localToken = localStorage.getItem('token');
  const localLunaToken = localStorage.getItem('luna_auth_token');
  
  console.log('  Session storage token:', !!sessionToken);
  console.log('  Local storage "token":', !!localToken);
  console.log('  Local storage "luna_auth_token":', !!localLunaToken);
  
  return {
    token: !!token,
    user: !!user,
    isAuthenticated,
    isAdmin,
    sessionToken: !!sessionToken,
    localToken: !!localToken,
    localLunaToken: !!localLunaToken
  };
} 