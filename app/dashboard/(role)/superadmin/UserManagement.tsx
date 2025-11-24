// app/dashboard/(role)/superadmin/UserManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building, Plus, Eye, Edit, Trash2, Loader2, RefreshCw, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface DepartmentStat {
  id: string;
  name: string;
  userCount: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error('Gagal memuat data pengguna');
        }
        
        const userData: User[] = await response.json();
        setUsers(userData);
        
        // Calculate department statistics
        const deptMap = new Map<string, DepartmentStat>();
        userData.forEach(user => {
          if (user.department) {
            const deptId = user.department.id;
            const deptName = user.department.name;
            
            if (deptMap.has(deptId)) {
              const stat = deptMap.get(deptId)!;
              deptMap.set(deptId, { ...stat, userCount: stat.userCount + 1 });
            } else {
              deptMap.set(deptId, { id: deptId, name: deptName, userCount: 1 });
            }
          }
        });
        
        setDepartments(Array.from(deptMap.values()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'storage-master-manager': return 'bg-cyan-100 text-cyan-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'storage-master': return 'bg-purple-100 text-purple-800';
      case 'item-master': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Calculate user statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.role !== 'inactive').length;
  const inactiveUsers = totalUsers - activeUsers;
  const superAdmins = users.filter(user => user.role === 'superadmin').length;

  // Calculate user role statistics
  const roleStats = users.reduce((acc, user) => {
    const role = user.role;
    if (acc[role]) {
      acc[role] += 1;
    } else {
      acc[role] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const userRoleData = Object.entries(roleStats).map(([role, count]) => ({
    role: role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    count
  }));

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Trash2 className="h-6 w-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Kesalahan memuat data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                Coba Lagi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Segarkan Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users by Role Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Pengguna berdasarkan Peran
            </CardTitle>
            <CardDescription>
              Distribusi pengguna berdasarkan peran masing-masing
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {userRoleData.length > 0 ? (
              <div className="space-y-2">
                {userRoleData.map((stat) => (
                  <div 
                    key={stat.role} 
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-purple-500" />
                      <span className="font-medium text-gray-900">{stat.role}</span>
                    </div>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {stat.count}
                    </Badge>
                  </div>
                ))}
                <div className="pt-4 border-t bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Pengguna</span>
                    <Badge variant="default" className="text-lg px-4 py-1">
                      {userRoleData.reduce((sum, item) => sum + item.count, 0).toLocaleString('id-ID')}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">Tidak ada data pengguna</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Departments Overview Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-orange-600" />
              Ringkasan Departemen
            </CardTitle>
            <CardDescription>
              Kelola departemen dan penggunanya
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {departments.map((dept) => (
                <div 
                  key={dept.id} 
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-gray-900">{dept.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Pengguna:</span>
                    <Badge variant="secondary" className="bg-orange-50 text-orange-800 border-orange-200">
                      {dept.userCount}
                    </Badge>
                  </div>
                </div>
              ))}
              {departments.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Building className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Tidak ada departemen ditemukan</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700" asChild>
                <Link href="/dashboard/departments">
                  <Plus className="h-4 w-4 mr-2" />
                  Kelola Departemen
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users Table */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Pengguna Terbaru
          </CardTitle>
          <CardDescription>
            Pengguna yang baru saja ditambahkan atau diubah
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className={`${getRoleBadgeColor(user.role)} w-fit py-[2px] px-2 rounded-md font-semibold`}>
                        {user.role}
                      </div>
                    </TableCell>
                    <TableCell>{user.department?.name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Tidak ada pengguna ditemukan
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}