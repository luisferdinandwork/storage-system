// app/dashboard/(role)/superadmin/ClearanceManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, FileText, CheckCircle, XCircle, AlertTriangle, Plus, Eye, Loader2, RefreshCw, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ClearanceItem {
  productCode: string;
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  period: string;
  season: string;
  unitOfMeasure: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdByUser: {
    id: string;
    name: string;
  };
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
  };
  clearances: Array<{
    id: string;
    itemId: string;
    quantity: number;
    requestedBy: string;
    requestedAt: string;
    reason: string;
    status: string;
    approvedBy: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
    clearedAt: string | null;
    metadata: any;
  }>;
  location: {
    id: string;
    name: string;
    boxId: string;
    boxNumber: string;
  } | null;
}

interface ApiResponse {
  items: ClearanceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ClearanceManagement() {
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalItems: 0,
    pendingApproval: 0,
    approvedItems: 0,
    totalQuantity: 0,
  });

  useEffect(() => {
    const fetchClearanceData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/items/clearance');
        
        if (!response.ok) {
          throw new Error('Failed to fetch clearance data');
        }
        
        const data: ApiResponse = await response.json();
        setClearanceItems(data.items);
        
        // Calculate summary data
        const totalItems = data.pagination.total;
        const pendingApproval = data.items.filter(item => 
          item.clearances.length > 0 && item.clearances[0].status === 'pending_approval'
        ).length;
        const approvedItems = data.items.filter(item => 
          item.clearances.length > 0 && item.clearances[0].status === 'approved'
        ).length;
        const totalQuantity = data.items.reduce((sum, item) => sum + (item.stock?.inClearance || 0), 0);
        
        setSummary({
          totalItems,
          pendingApproval,
          approvedItems,
          totalQuantity,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchClearanceData();
  }, []);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-amber-100 text-amber-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_approval': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'processed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'draft': return <FileText className="h-4 w-4 text-gray-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Loading clearance management data...</p>
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
              <h3 className="text-lg font-semibold text-red-800">Error loading data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                Retry
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
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Items
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingApproval}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved Items
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approvedItems}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Quantity
            </CardTitle>
            <Archive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQuantity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clearance Items Table */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-green-600" />
            Clearance Items
          </CardTitle>
          <CardDescription>
            Items currently in clearance process
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clearanceItems.map((item) => (
                  <TableRow key={item.productCode} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{item.productCode}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell>{item.brandCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.stock?.inClearance || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{item.location.name} (Box {item.location.boxNumber})</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/items/${item.productCode}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {clearanceItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No clearance items found
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button className="w-full md:w-auto bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700" asChild>
          <Link href="/dashboard/item-clearance">
            <Plus className="h-4 w-4 mr-2" />
            Manage All Clearance Items
          </Link>
        </Button>
      </div>
    </div>
  );
}