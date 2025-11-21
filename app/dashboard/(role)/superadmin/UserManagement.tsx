// app/dashboard/(role)/superadmin/UserManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function UserManagement() {
  // Mock data for demonstration
  const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'superadmin', department: 'IT' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', department: 'HR' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'user', department: 'Finance' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'storage-master', department: 'Operations' },
  ];

  const departments = [
    { id: '1', name: 'IT', userCount: 12 },
    { id: '2', name: 'HR', userCount: 8 },
    { id: '3', name: 'Finance', userCount: 15 },
    { id: '4', name: 'Operations', userCount: 20 },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'storage-master': return 'bg-purple-100 text-purple-800';
      case 'item-master': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Users Overview
            </CardTitle>
            <CardDescription>
              Manage system users and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Users</span>
                <span className="text-lg font-semibold">55</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Active Users</span>
                <span className="text-lg font-semibold">48</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Inactive Users</span>
                <span className="text-lg font-semibold">7</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Superadmins</span>
                <span className="text-lg font-semibold">2</span>
              </div>
            </div>
            <div className="mt-4">
              <Button className="w-full" asChild>
                <Link href="/dashboard/users">
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Users
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-500" />
              Departments Overview
            </CardTitle>
            <CardDescription>
              Manage departments and their users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departments.map((dept) => (
                <div key={dept.id} className="flex justify-between items-center">
                  <span>{dept.name}</span>
                  <Badge variant="outline">{dept.userCount} users</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button className="w-full" asChild>
                <Link href="/dashboard/departments">
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Departments
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>
            Recently added or modified users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/users/${user.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/users/${user.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}