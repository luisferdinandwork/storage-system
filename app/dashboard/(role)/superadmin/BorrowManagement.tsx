// app/dashboard/(role)/superadmin/BorrowManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, CheckCircle, XCircle, AlertTriangle, Clock, Plus, Eye } from 'lucide-react';
import Link from 'next/link';

export default function BorrowManagement() {
  // Mock data for demonstration
  const borrowRequests = [
    { 
      id: 'BRW-00001', 
      user: 'John Doe', 
      status: 'pending_manager', 
      requestedAt: '2023-06-15',
      items: 3 
    },
    { 
      id: 'BRW-00002', 
      user: 'Jane Smith', 
      status: 'pending_storage', 
      requestedAt: '2023-06-14',
      items: 2 
    },
    { 
      id: 'BRW-00003', 
      user: 'Bob Johnson', 
      status: 'active', 
      requestedAt: '2023-06-10',
      items: 1 
    },
    { 
      id: 'BRW-00004', 
      user: 'Alice Brown', 
      status: 'complete', 
      requestedAt: '2023-06-05',
      items: 4 
    },
  ];

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Requests
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">324</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Manager
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Storage
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Borrows
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Borrow Requests</CardTitle>
          <CardDescription>
            Recently submitted borrow requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.id}</TableCell>
                    <TableCell>{request.user}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <Badge className={`ml-2 ${getStatusBadgeColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{request.requestedAt}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.items} items</Badge>
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Requests by Status</CardTitle>
            <CardDescription>
              Distribution of borrow requests by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Pending Manager</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-amber-600 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <span>15%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Pending Storage</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                  <span>10%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Active</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '55%' }}></div>
                  </div>
                  <span>55%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Complete</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  <span>20%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Overdue Returns</CardTitle>
            <CardDescription>
              Items that are overdue for return
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>1-3 days overdue</span>
                <Badge variant="outline">5 items</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>4-7 days overdue</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800">3 items</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>7+ days overdue</span>
                <Badge variant="destructive">2 items</Badge>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">View All Overdue Items</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button className="w-full md:w-auto" asChild>
          <Link href="/dashboard/requests/pending">
            <Plus className="h-4 w-4 mr-2" />
            Manage All Requests
          </Link>
        </Button>
      </div>
    </div>
  );
}