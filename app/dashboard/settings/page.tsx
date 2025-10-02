'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, User, Lock, Bell, Database, Shield, Save, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemSettings {
  maxBorrowDays: number;
  requireDualApproval: boolean;
  autoRemindReturn: boolean;
  reminderDays: number;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Profile settings
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });
  
  // Password settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // System settings (admin/manager only)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maxBorrowDays: 14,
    requireDualApproval: true,
    autoRemindReturn: true,
    reminderDays: 2,
  });

  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const isUser = session?.user?.role === 'user';

  useEffect(() => {
    if (session?.user) {
      setProfile({
        name: session.user.name || '',
        email: session.user.email || '',
      });
    }
    fetchSystemSettings();
  }, [session]);

  const fetchSystemSettings = async () => {
    if (!isAdmin && !isManager) return;
    
    try {
      const response = await fetch('/api/settings/system');
      if (response.ok) {
        const data = await response.json();
        setSystemSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSuccessMessage('Profile updated successfully');
      } else {
        const data = await response.json();
        setSuccessMessage(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setSuccessMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSuccessMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const data = await response.json();
        setSuccessMessage(data.error || 'Failed to change password');
      }
    } catch (error) {
      setSuccessMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleSystemSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');

    try {
      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      });

      if (response.ok) {
        setSuccessMessage('System settings updated successfully');
      } else {
        const data = await response.json();
        setSuccessMessage(data.error || 'Failed to update system settings');
      }
    } catch (error) {
      setSuccessMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      
      {successMessage && (
        <div className={cn(
          "mb-6 p-4 rounded-md",
          successMessage.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        )}>
          {successMessage}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5 text-primary-500" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Role</p>
                  <p className="text-sm text-gray-500 capitalize">{session?.user?.role}</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5 text-primary-500" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System Settings (Admin/Manager Only) */}
        {(isAdmin || isManager) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-primary-500" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSystemSettingsUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="maxBorrowDays" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Borrow Days
                    </label>
                    <Input
                      id="maxBorrowDays"
                      type="number"
                      min="1"
                      max="30"
                      value={systemSettings.maxBorrowDays}
                      onChange={(e) => setSystemSettings({ ...systemSettings, maxBorrowDays: parseInt(e.target.value) || 14 })}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label htmlFor="reminderDays" className="block text-sm font-medium text-gray-700 mb-1">
                      Return Reminder (Days Before Due)
                    </label>
                    <Input
                      id="reminderDays"
                      type="number"
                      min="1"
                      max="7"
                      value={systemSettings.reminderDays}
                      onChange={(e) => setSystemSettings({ ...systemSettings, reminderDays: parseInt(e.target.value) || 2 })}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="requireDualApproval"
                      type="checkbox"
                      checked={systemSettings.requireDualApproval}
                      onChange={(e) => setSystemSettings({ ...systemSettings, requireDualApproval: e.target.checked })}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <label htmlFor="requireDualApproval" className="ml-2 block text-sm text-gray-700">
                      Require dual approval (Manager + Admin) for all borrow requests
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="autoRemindReturn"
                      type="checkbox"
                      checked={systemSettings.autoRemindReturn}
                      onChange={(e) => setSystemSettings({ ...systemSettings, autoRemindReturn: e.target.checked })}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <label htmlFor="autoRemindReturn" className="ml-2 block text-sm text-gray-700">
                      Send automatic return reminders to users
                    </label>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  {isLoading ? 'Updating...' : 'Update System Settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Database Management (Admin Only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-primary-500" />
                Database Management
              </CardTitle>
              <CardDescription>
                Manage database operations and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-2">Export Data</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Export all system data for backup or analysis
                  </p>
                  <Button variant="outline" className="mr-2">
                    Export to CSV
                  </Button>
                  <Button variant="outline">
                    Export to JSON
                  </Button>
                </div>
                
                <div className="p-4 bg-amber-50 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-2">Clear Old Data</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Remove completed requests older than 30 days
                  </p>
                  <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-100">
                    Clear Old Requests
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Settings (Admin Only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary-500" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <h4 className="font-medium text-gray-900">Session Timeout</h4>
                    <p className="text-sm text-gray-600">Automatically log out users after inactivity</p>
                  </div>
                  <select className="p-2 border border-gray-300 rounded-md">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>2 hours</option>
                    <option>4 hours</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <h4 className="font-medium text-gray-900">Password Policy</h4>
                    <p className="text-sm text-gray-600">Minimum password length requirements</p>
                  </div>
                  <select className="p-2 border border-gray-300 rounded-md">
                    <option>6 characters</option>
                    <option>8 characters</option>
                    <option>12 characters</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}