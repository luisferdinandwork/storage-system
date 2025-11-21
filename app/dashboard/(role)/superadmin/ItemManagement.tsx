// app/dashboard/(role)/superadmin/ItemManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, AlertTriangle, Plus, Eye, Edit } from 'lucide-react';
import Link from 'next/link';

export default function ItemManagement() {
  // Mock data for demonstration
  const items = [
    { 
      id: 'PIE210000001', 
      description: 'Piero Football Shoes', 
      brand: 'PIE', 
      category: 'Football', 
      status: 'approved',
      stock: 25 
    },
    { 
      id: 'SPE110000002', 
      description: 'Specs Running Shoes', 
      brand: 'SPE', 
      category: 'Running', 
      status: 'pending_approval',
      stock: 15 
    },
    { 
      id: 'PIE220000003', 
      description: 'Piero Sports T-Shirt', 
      brand: 'PIE', 
      category: 'Apparel', 
      status: 'approved',
      stock: 50 
    },
    { 
      id: 'SPE130000004', 
      description: 'Specs Sports Bag', 
      brand: 'SPE', 
      category: 'Accessories', 
      status: 'rejected',
      stock: 0 
    },
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-amber-100 text-amber-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_approval': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Items
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
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
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Low Stock Items
            </CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Items</CardTitle>
          <CardDescription>
            Recently added or modified items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <Badge className={`ml-2 ${getStatusBadgeColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.stock < 10 ? "destructive" : "outline"}>
                        {item.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.id}/edit`}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Items by Brand</CardTitle>
            <CardDescription>
              Distribution of items by brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>PIERO</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span>65%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>SPECS</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                  <span>35%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
            <CardDescription>
              Distribution of items by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Footwear</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <span>45%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Apparel</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                  <span>30%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Accessories</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <span>25%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button className="w-full md:w-auto" asChild>
          <Link href="/dashboard/items">
            <Plus className="h-4 w-4 mr-2" />
            Manage All Items
          </Link>
        </Button>
      </div>
    </div>
  );
}