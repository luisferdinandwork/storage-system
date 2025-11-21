// app/dashboard/(role)/superadmin/StorageManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BoxIcon, MapPin, Package, AlertTriangle, Plus, Eye } from 'lucide-react';
import Link from 'next/link';

export default function StorageManagement() {
  // Mock data for demonstration
  const locations = [
    { id: '1', name: 'Main Warehouse', boxes: 24, items: 342 },
    { id: '2', name: 'Secondary Storage', boxes: 16, items: 215 },
    { id: '3', name: 'Retail Store', boxes: 8, items: 87 },
    { id: '4', name: 'Distribution Center', boxes: 32, items: 456 },
  ];

  const boxes = [
    { id: '1', boxNumber: 'A-001', location: 'Main Warehouse', items: 15 },
    { id: '2', boxNumber: 'A-002', location: 'Main Warehouse', items: 22 },
    { id: '3', boxNumber: 'B-001', location: 'Secondary Storage', items: 18 },
    { id: '4', boxNumber: 'C-001', location: 'Retail Store', items: 8 },
  ];

  const lowStockItems = [
    { id: 'PIE210000001', description: 'Piero Football Shoes', stock: 3, location: 'Main Warehouse' },
    { id: 'SPE110000002', description: 'Specs Running Shoes', stock: 2, location: 'Secondary Storage' },
    { id: 'PIE220000003', description: 'Piero Sports T-Shirt', stock: 4, location: 'Retail Store' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Locations
            </CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Boxes
            </CardTitle>
            <BoxIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Stored Items
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Storage Locations</CardTitle>
            <CardDescription>
              Overview of all storage locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations.map((location) => (
                <div key={location.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-gray-500">{location.boxes} boxes</div>
                  </div>
                  <Badge variant="outline">{location.items} items</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/stock-locations">
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Locations
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Storage Boxes</CardTitle>
            <CardDescription>
              Overview of storage boxes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {boxes.map((box) => (
                <div key={box.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{box.boxNumber}</div>
                    <div className="text-sm text-gray-500">{box.location}</div>
                  </div>
                  <Badge variant="outline">{box.items} items</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/storage">
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Boxes
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>
            Items with low stock that need attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.stock}</Badge>
                    </TableCell>
                    <TableCell>{item.location}</TableCell>
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
          <Link href="/dashboard/item-movements">
            <Plus className="h-4 w-4 mr-2" />
            View Stock Movements
          </Link>
        </Button>
      </div>
    </div>
  );
}