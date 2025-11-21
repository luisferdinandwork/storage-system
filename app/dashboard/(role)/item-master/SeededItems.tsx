// app/dashboard/(role)/item-master/SeededItems.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, AlertCircle, Eye, MapPin, Box } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ItemImage {
  id: string;
  fileName: string;
  altText: string | null;
  isPrimary: boolean;
}

interface StockRecord {
  id: string;
  itemId: string;
  pending: number;
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
  boxId: string | null;
  box?: {
    id: string;
    boxNumber: string;
    description: string | null;
    location: {
      id: string;
      name: string;
    } | null;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
  condition: string;
  conditionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  images: ItemImage[];
  totalStock: number;
  stock: {
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
  };
  stockRecords: StockRecord[];
}

export default function SeededItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSeededItems();
  }, []);

  const fetchSeededItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/items?status=approved');
      
      if (!response.ok) {
        throw new Error('Failed to fetch seeded items');
      }
      
      const data = await response.json();
      
      // Filter for items with seeded stock
      const seededItems = data.filter((item: Item) => item.stock.seeded > 0);
      setItems(seededItems);
    } catch (err) {
      console.error('Error fetching seeded items:', err);
      setError('Failed to load seeded items');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            Seeded Items
          </CardTitle>
          <CardDescription>
            Items that have been seeded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Loading seeded items...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            Seeded Items
          </CardTitle>
          <CardDescription>
            Items that have been seeded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={fetchSeededItems} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-500" />
          Seeded Items
        </CardTitle>
        <CardDescription>
          Items that have been seeded
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Seeded Quantity</TableHead>
                  <TableHead>Total Stock</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  // Find the first location with seeded items
                  const seededRecord = item.stockRecords.find(record => record.seeded > 0);
                  const locationName = seededRecord?.box?.location?.name || 
                                    seededRecord?.location?.name || 
                                    'Unknown';
                  
                  return (
                    <TableRow key={item.productCode}>
                      <TableCell className="font-medium">{item.productCode}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>{item.brandCode}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.stock.seeded}</Badge>
                      </TableCell>
                      <TableCell>{item.totalStock}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{locationName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.productCode}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Seeded Items</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No items have been seeded yet. Seeded items will appear here once they are added.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}