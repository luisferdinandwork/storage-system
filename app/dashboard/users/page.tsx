// app/dashboard/users/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search, Edit, Trash2, Mail, Shield, Building, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  departmentId?: string;
  department?: {
    id: string;
    name: string;
  };
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
}

interface Department {
  id: string;
  name: string;
  description: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'user' as 'admin' | 'manager' | 'user',
    departmentId: ''
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState({ 
    name: '', 
    email: '', 
    role: 'user' as 'admin' | 'manager' | 'user',
    departmentId: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Add mock data for lastLogin and status
        const usersWithStatus = data.map((user: User) => ({
          ...user,
          lastLogin: user.id === session?.user?.id ? new Date().toISOString() : undefined,
          status: 'active' as const
        }));
        setUsers(usersWithStatus);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setNewUser({ name: '', email: '', password: '', role: 'user', departmentId: '' });
        setShowAddForm(false);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editUser),
      });

      if (response.ok) {
        setEditingUserId(null);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeletingUserId(null);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const startEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditUser({ 
      name: user.name, 
      email: user.email, 
      role: user.role,
      departmentId: user.departmentId || '',
      status: user.status
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.department?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-gray-100 text-gray-800';
      default:
        return '';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Users className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="bg-primary-500 hover:bg-primary-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'manager' | 'user' })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    id="department"
                    value={newUser.departmentId}
                    onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    disabled={isSubmitting || newUser.role === 'admin'}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-primary-500 hover:bg-primary-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add User'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          {user.id === session?.user?.id && (
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <Mail className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        {user.department && (
                          <div className="flex items-center mt-1">
                            <Building className="h-4 w-4 text-gray-400 mr-1" />
                            <p className="text-sm text-gray-500">{user.department.name}</p>
                          </div>
                        )}
                        <div className="flex items-center mt-1 space-x-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getRoleColor(user.role)
                          )}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1">{user.role}</span>
                          </span>
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          )}>
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditUser(user)}
                        disabled={user.id === session?.user?.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingUserId(user.id)}
                        disabled={user.id === session?.user?.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {editingUserId === user.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <Input
                            value={editUser.name}
                            onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <Input
                            type="email"
                            value={editUser.email}
                            onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <select
                            value={editUser.role}
                            onChange={(e) => setEditUser({ ...editUser, role: e.target.value as 'admin' | 'manager' | 'user' })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={isSubmitting}
                          >
                            <option value="user">User</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department
                          </label>
                          <select
                            value={editUser.departmentId}
                            onChange={(e) => setEditUser({ ...editUser, departmentId: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={isSubmitting || editUser.role === 'admin'}
                          >
                            <option value="">Select a department</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <select
                            value={editUser.status}
                            onChange={(e) => setEditUser({ ...editUser, status: e.target.value as 'active' | 'inactive' })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={isSubmitting}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Button
                          onClick={() => handleUpdateUser(user.id)}
                          className="bg-primary-500 hover:bg-primary-600"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Updating...' : 'Update'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingUserId(null)}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {deletingUserId === user.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-red-50 p-4 rounded-md">
                        <p className="text-sm text-red-800 mb-3">
                          Are you sure you want to delete {user.name}? This action cannot be undone.
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete User
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingUserId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding a new user'}
          </p>
        </div>
      )}
    </div>
  );
}