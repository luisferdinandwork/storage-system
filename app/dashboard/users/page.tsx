// app/dashboard/users/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Plus, Search, Edit, Trash2, Mail, Shield, Building, Calendar, X,
  Package, Archive, ArchiveX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'manager' | 'user' | 'storage-master' | 'item-master' | 'storage-master-manager';
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
    role: 'user' as User['role'],
    departmentId: ''
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    email: '', 
    role: 'user' as User['role'],
    departmentId: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
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

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    try {
      const response = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
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

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditForm({ 
      name: user.name, 
      email: user.email, 
      role: user.role,
      departmentId: user.departmentId || '',
      status: user.status
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.department?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'storage-master':
        return 'bg-purple-100 text-purple-800';
      case 'item-master':
        return 'bg-green-100 text-green-800';
      case 'storage-master-manager':
        return 'bg-indigo-100 text-indigo-800';
      case 'user':
        return 'bg-gray-100 text-gray-800';
      default:
        return '';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Users className="h-4 w-4" />;
      case 'storage-master':
        return <Archive className="h-4 w-4" />;
      case 'item-master':
        return <Package className="h-4 w-4" />;
      case 'storage-master-manager':
        return <ArchiveX className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'manager':
        return 'Manager';
      case 'storage-master':
        return 'Storage Master';
      case 'item-master':
        return 'Item Master';
      case 'storage-master-manager':
        return 'Storage Master Manager';
      case 'user':
        return 'User';
      default:
        return role;
    }
  };

  if (session?.user?.role !== 'superadmin') {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="bg-primary-500 hover:bg-primary-600 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {showAddForm && (
        <Card className="mb-6 border-primary-200 shadow-md">
          <CardHeader className="bg-primary-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <CardTitle className="text-primary-800">Add New User</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAddForm(false)}
                className="h-8 w-8 p-0 text-primary-600 hover:text-primary-800 hover:bg-primary-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
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
                    className="focus:ring-primary-500 focus:border-primary-500"
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
                    className="focus:ring-primary-500 focus:border-primary-500"
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
                    className="focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="storage-master">Storage Master</option>
                    <option value="item-master">Item Master</option>
                    <option value="storage-master-manager">Storage Master Manager</option>
                    <option value="superadmin">Super Admin</option>
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
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    disabled={isSubmitting || newUser.role === 'superadmin'}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-2 pt-2">
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
        <div className="bg-white shadow sm:rounded-md overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
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
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getRoleColor(user.role)
                          )}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1">{getRoleLabel(user.role)}</span>
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
                        onClick={() => openEditDialog(user)}
                        disabled={user.id === session?.user?.id}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-primary-600 hover:bg-primary-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(user)}
                        disabled={user.id === session?.user?.id}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-primary-800">Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-name" className="text-right text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="col-span-3 focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-email" className="text-right text-sm font-medium">
                Email
              </label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3 focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-role" className="text-right text-sm font-medium">
                Role
              </label>
              <select
                id="edit-role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as User['role'] })}
                className="col-span-3 p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="storage-master">Storage Master</option>
                <option value="item-master">Item Master</option>
                <option value="storage-master-manager">Storage Master Manager</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-department" className="text-right text-sm font-medium">
                Department
              </label>
              <select
                id="edit-department"
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                className="col-span-3 p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting || editForm.role === 'superadmin'}
              >
                <option value="">Select a department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-status" className="text-right text-sm font-medium">
                Status
              </label>
              <select
                id="edit-status"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                className="col-span-3 p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              className="bg-primary-500 hover:bg-primary-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-800">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {deletingUser?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{deletingUser?.name}</p>
                <p className="text-sm text-gray-600">{deletingUser?.email}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              All data associated with this user will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}