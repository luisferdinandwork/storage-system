// app/dashboard/(role)/superadmin/ItemManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, AlertTriangle, Plus, Eye, Edit, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Item {
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
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
  };
  totalStock: number;
  images: any[];
}

// Add product category mapping
const PRODUCT_CATEGORY_MAPPING: Record<string, string> = {
  '00': 'Lifestyle',
  '01': 'Football',
  '02': 'Futsal',
  '03': 'Street Soccer',
  '04': 'Running',
  '05': 'Training',
  '06': 'Volley',
  '08': 'Badminton',
  '09': 'Tennis',
  '10': 'Basketball',
  '12': 'Skateboard',
  '14': 'Swimming',
  '17': 'Back to school'
};

export default function ItemManagement() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/items');
        
        if (!response.ok) {
          throw new Error('Failed to fetch item data');
        }
        
        const itemData: Item[] = await response.json();
        setAllItems(itemData);
        
        // Sort by updatedAt to get the most recent items and take only 5
        const sortedItems = itemData
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
        setRecentItems(sortedItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics using all items
  const totalItems = allItems.length;
  const pendingItems = allItems.filter(item => item.status === 'pending_approval').length;
  const lowStockItems = allItems.filter(item => item.totalStock < 10).length;

  // Calculate brand distribution using all items
  const brandDistribution = allItems.reduce((acc, item) => {
    const brand = item.brandCode;
    if (acc[brand]) {
      acc[brand] += 1;
    } else {
      acc[brand] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate category distribution using all items and the mapping
  const categoryDistribution = allItems.reduce((acc, item) => {
    const categoryCode = item.productCategory;
    const categoryName = PRODUCT_CATEGORY_MAPPING[categoryCode] || categoryCode;
    if (acc[categoryName]) {
      acc[categoryName] += 1;
    } else {
      acc[categoryName] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Function to get category name from code
  const getCategoryName = (categoryCode: string) => {
    return PRODUCT_CATEGORY_MAPPING[categoryCode] || categoryCode;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Loading item management data...</p>
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

      {/* Stats Cards - using all items data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Items
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
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
            <div className="text-2xl font-bold">{pendingItems}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Low Stock Items
            </CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Items Table - showing only 5 most recent */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Recent Items
          </CardTitle>
          <CardDescription>
            Recently added or modified items
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
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentItems.map((item) => (
                  <TableRow key={item.productCode} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{item.productCode}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell>{item.brandCode}</TableCell>
                    <TableCell>{getCategoryName(item.productCategory)}</TableCell>
                    <TableCell>
                      <Badge variant={item.totalStock < 10 ? "destructive" : "outline"}>
                        {item.totalStock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.productCode}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.productCode}/edit`}>
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
          {recentItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No items found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution Cards - using all items data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Items by Brand */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Items by Brand
            </CardTitle>
            <CardDescription>
              Distribution of items by brand
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Object.entries(brandDistribution).map(([brand, count]) => {
                const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                return (
                  <div key={brand} className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{brand}</span>
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
              {Object.keys(brandDistribution).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No brand data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Items by Category */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Items by Category
            </CardTitle>
            <CardDescription>
              Distribution of items by category
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Object.entries(categoryDistribution).map(([category, count]) => {
                const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                return (
                  <div key={category} className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{category}</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-orange-600 h-2.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(categoryDistribution).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No category data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button className="w-full md:w-auto bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700" asChild>
          <Link href="/dashboard/items">
            <Plus className="h-4 w-4 mr-2" />
            Manage All Items
          </Link>
        </Button>
      </div>
    </div>
  );
}