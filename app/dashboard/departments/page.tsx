// app/dashboard/departments/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, Plus, Search, Edit, Trash2, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: ''
  });
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
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

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return;
    
    try {
      const response = await fetch(`/api/departments/${deletingDepartment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
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

  const openEditDialog = (dept: Department) => {
    setEditingDepartment(dept);
    setEditForm({ 
      name: dept.name, 
      description: dept.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setDeletingDepartment(dept);
    setIsDeleteDialogOpen(true);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="bg-primary-500 hover:bg-primary-600 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {showAddForm && (
        <Card className="mb-6 border-primary-200 shadow-md">
          <CardHeader className="bg-primary-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <CardTitle className="text-primary-800">Add New Department</CardTitle>
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
                  className="focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex space-x-2 pt-2">
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
            <Card key={dept.id} className="transition-all duration-200 hover:shadow-md">
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
                      onClick={() => openEditDialog(dept)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-primary-600 hover:bg-primary-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(dept)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {dept.description && (
                  <CardDescription className="mt-1">{dept.description}</CardDescription>
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

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-primary-800">Edit Department</DialogTitle>
            <DialogDescription>
              Make changes to the department information below.
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
              <label htmlFor="edit-description" className="text-right text-sm font-medium">
                Description
              </label>
              <textarea
                id="edit-description"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="col-span-3 p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
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
              onClick={handleUpdateDepartment}
              className="bg-primary-500 hover:bg-primary-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-800">Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
              <Building className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-medium">{deletingDepartment?.name}</p>
                {deletingDepartment?.description && (
                  <p className="text-sm text-gray-600">{deletingDepartment.description}</p>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Users in this department will need to be reassigned.
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
              onClick={handleDeleteDepartment}
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