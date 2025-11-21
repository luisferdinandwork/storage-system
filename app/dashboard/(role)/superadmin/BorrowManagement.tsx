// app/dashboard/(role)/superadmin/BorrowManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, CheckCircle, XCircle, AlertTriangle, Clock, Plus, Eye, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BorrowRequest {
  id: string;
  userId: string;
  requestedAt: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  managerApprovedBy: {
    id: string;
    name: string;
  } | null;
  storageApprovedBy: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: {
      id: string;
      name: string;
    } | null;
  };
  items: Array<{
    id: string;
    borrowRequestId: string;
    itemId: string;
    quantity: number;
    status: string;
    item: {
      productCode: string;
      description: string;
      brandCode: string;
      productDivision: string;
      productCategory: string;
      period: string;
      season: string;
      unitOfMeasure: string;
      status: string;
      images: Array<any>;
      stock: {
        id: string;
        itemId: string;
        pending: number;
        inStorage: number;
        onBorrow: number;
        inClearance: number;
        seeded: number;
        boxId: string | null;
        condition: string;
        conditionNotes: string | null;
        createdAt: string;
        updatedAt: string;
        box: {
          id: string;
          locationId: string;
          boxNumber: string;
          description: string | null;
          createdAt: string;
          updatedAt: string;
          location: {
            id: string;
            name: string;
            description: string | null;
            createdAt: string;
            updatedAt: string;
          };
        } | null;
      };
    };
  }>;
}

export default function BorrowManagement() {
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/borrow-requests');
        
        if (!response.ok) {
          throw new Error('Failed to fetch borrow request data');
        }
        
        const requestData: BorrowRequest[] = await response.json();
        setBorrowRequests(requestData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const totalRequests = borrowRequests.length;
  const pendingManager = borrowRequests.filter(req => req.status === 'pending_manager').length;
  const pendingStorage = borrowRequests.filter(req => req.status === 'pending_storage').length;
  const activeBorrows = borrowRequests.filter(req => req.status === 'active').length;

  // Calculate status distribution
  const statusDistribution = borrowRequests.reduce((acc, req) => {
    const status = req.status;
    if (acc[status]) {
      acc[status] += 1;
    } else {
      acc[status] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate overdue returns (simplified for now)
  const overdueItems = borrowRequests
    .filter(req => req.status === 'active' && new Date(req.endDate) < new Date())
    .reduce((acc, req) => acc + req.items.length, 0);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending_manager': return 'bg-amber-100 text-amber-800';
      case 'pending_storage': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'complete': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_manager': 
      case 'pending_storage': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'complete': return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_manager': return 'Menunggu Persetujuan Manajer';
      case 'pending_storage': return 'Menunggu Persetujuan Gudang';
      case 'active': return 'Aktif';
      case 'complete': return 'Selesai';
      case 'rejected': return 'Ditolak';
      default: return status;
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

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Memuat data manajemen peminjaman...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <XCircle className="h-6 w-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error memuat data</h3>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Permintaan
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Menunggu Manajer
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingManager}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Menunggu Gudang
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingStorage}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Peminjaman Aktif
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBorrows}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Borrow Requests Table */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Permintaan Peminjaman Terbaru
          </CardTitle>
          <CardDescription>
            Permintaan peminjaman yang diajukan baru-baru ini
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Permintaan</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Diajukan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{request.id}</TableCell>
                    <TableCell>{request.user.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <Badge className={`ml-2 ${getStatusBadgeColor(request.status)}`}>
                          {getStatusText(request.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(request.requestedAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.items.length} item</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/borrow-requests/${request.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {borrowRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Tidak ada permintaan peminjaman ditemukan
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Requests by Status */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Permintaan Berdasarkan Status
            </CardTitle>
            <CardDescription>
              Distribusi permintaan peminjaman berdasarkan status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Object.entries(statusDistribution).map(([status, count]) => {
                const percentage = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{getStatusText(status)}</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-purple-600 h-2.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(statusDistribution).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Tidak ada data status tersedia
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Overdue Returns */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
          <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Pengembalian Terlambat
            </CardTitle>
            <CardDescription>
              Item yang terlambat dikembalikan
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>1-3 hari terlambat</span>
                <Badge variant="outline">5 item</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>4-7 hari terlambat</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800">3 item</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>7+ hari terlambat</span>
                <Badge variant="destructive">2 item</Badge>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">Lihat Semua Item Terlambat</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button className="w-full md:w-auto bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700" asChild>
          <Link href="/dashboard/requests/pending">
            <Plus className="h-4 w-4 mr-2" />
            Kelola Semua Permintaan
          </Link>
        </Button>
      </div>
    </div>
  );
}