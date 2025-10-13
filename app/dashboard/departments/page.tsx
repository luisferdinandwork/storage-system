// app/dashboard/departments/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  userCount?: number;
}

export default function DepartmentsPage() {
  const { data: session } = useSession();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ 
    name: '', 
    description: ''
  });
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDepartment, setEditDepartment] = useState({ 
    name: '', 
    description: ''
  });
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDepartment),
      });

      if (response.ok) {
        setNewDepartment({ name: '', description: '' });
        setShowAddForm(false);
        fetchDepartments();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add department');
      }
    } catch (error) {
      console.error('Failed to add department:', error);
      alert('Failed to add department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDepartment = async (deptId: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/departments/${deptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editDepartment),
      });

      if (response.ok) {
        setEditingDeptId(null);
        fetchDepartments();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update department');
      }
    } catch (error) {
      console.error('Failed to update department:', error);
      alert('Failed to update department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department? Users in this department will need to be reassigned.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/departments/${deptId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeletingDeptId(null);
        fetchDepartments();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('Failed to delete department');
    }
  };

  const startEditDepartment = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditDepartment({ 
      name: dept.name, 
      description: dept.description || ''
    });
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (session?.user?.role !== 'superadmin') {
    return (
      <div className="text-center py-12">
        <Building className="mx-auto h-12 w-12 text-gray-400" />
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
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="bg-primary-500 hover:bg-primary-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Department</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDepartment} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-primary-500 hover:bg-primary-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Department'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => (
            <Card key={dept.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-primary-500 mr-2" />
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditDepartment(dept)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingDeptId(dept.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {dept.description && (
                  <CardDescription>{dept.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm text-gray-500">
                    {dept.userCount || 0} users
                  </p>
                </div>
              </CardContent>
              
              {editingDeptId === dept.id && (
                <div className="absolute inset-0 bg-white bg-opacity-95 p-4 rounded-lg flex flex-col justify-center">
                  <h3 className="font-medium mb-2">Edit Department</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department Name
                      </label>
                      <Input
                        value={editDepartment.name}
                        onChange={(e) => setEditDepartment({ ...editDepartment, name: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={editDepartment.description}
                        onChange={(e) => setEditDepartment({ ...editDepartment, description: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateDepartment(dept.id)}
                      className="bg-primary-500 hover:bg-primary-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDeptId(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {deletingDeptId === dept.id && (
                <div className="absolute inset-0 bg-white bg-opacity-95 p-4 rounded-lg flex flex-col justify-center">
                  <h3 className="font-medium mb-2">Delete Department</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Are you sure you want to delete {dept.name}? Users in this department will need to be reassigned.
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingDeptId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredDepartments.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No departments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding a new department'}
          </p>
        </div>
      )}
    </div>
  );
}