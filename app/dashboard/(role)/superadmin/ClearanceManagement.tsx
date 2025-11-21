// app/dashboard/(role)/superadmin/ClearanceManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, FileText, CheckCircle, XCircle, AlertTriangle, Plus, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ClearanceManagement() {
  // Mock data for demonstration
  const clearanceForms = [
    { 
      id: 'CF-2023-Q2-001', 
      title: 'Q2 2023 Clearance', 
      status: 'approved', 
      items: 24,
      createdAt: '2023-06-01' 
    },
    { 
      id: 'CF-2023-Q2-002', 
      title: 'Retail Store Clearance', 
      status: 'pending_approval', 
      items: 12,
      createdAt: '2023-06-10' 
    },
    { 
      id: 'CF-2023-Q1-003', 
      title: 'Q1 2023 Clearance', 
      status: 'processed', 
      items: 18,
      createdAt: '2023-03-15' 
    },
    { 
      id: 'CF-2023-Q2-004', 
      title: 'Warehouse Clearance', 
      status: 'draft', 
      items: 8,
      createdAt: '2023-06-12' 
    },
  ];

  const clearedItems = [
    { id: 'PIE210000001', description: 'Piero Football Shoes', quantity: 5, form: 'CF-2023-Q2-001' },
    { id: 'SPE110000002', description: 'Specs Running Shoes', quantity: 3, form: 'CF-2023-Q2-001' },
    { id: 'PIE220000003', description: 'Piero Sports T-Shirt', quantity: 10, form: 'CF-2023-Q1-003' },
  ];

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Forms
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cleared Items
            </CardTitle>
            <Archive className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Items in Clearance
            </CardTitle>
            <Archive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clearance Forms</CardTitle>
          <CardDescription>
            Recent clearance forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clearanceForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.id}</TableCell>
                    <TableCell>{form.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(form.status)}
                        <Badge className={`ml-2 ${getStatusBadgeColor(form.status)}`}>
                          {form.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{form.items} items</Badge>
                    </TableCell>
                    <TableCell>{form.createdAt}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/clearance/${form.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently Cleared Items</CardTitle>
          <CardDescription>
            Items that have been recently cleared
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Clearance Form</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clearedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell>{item.form}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/items/${item.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button className="w-full md:w-auto" asChild>
          <Link href="/dashboard/clearance">
            <Plus className="h-4 w-4 mr-2" />
            Manage All Clearance Forms
          </Link>
        </Button>
      </div>
    </div>
  );
}