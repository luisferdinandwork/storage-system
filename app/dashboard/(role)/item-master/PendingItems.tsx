// app/dashboard/(role)/item-master/PendingItems.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, AlertCircle, Eye, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ItemImage {
  id: string;
  fileName: string;
  altText: string | null;
  isPrimary: boolean;
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
}

interface ItemRequest {
  id: string;
  itemId: string;
  requestedBy: {
    id: string;
    name: string;
    role: string;
  };
  requestedAt: string;
  status: string;
  approvedBy: {
    id: string;
    name: string;
  } | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  item: Item;
}

export default function PendingItems() {
  const [items, setItems] = useState<ItemRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/item-requests?status=pending_approval');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending items');
      }
      
      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error('Error fetching pending items:', err);
      setError('Failed to load pending items');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Pending Items
          </CardTitle>
          <CardDescription>
            Items awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Loading pending items...</p>
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
            <FileText className="h-5 w-5 text-amber-500" />
            Pending Items
          </CardTitle>
          <CardDescription>
            Items awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={fetchPendingItems} variant="outline">
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
          <FileText className="h-5 w-5 text-amber-500" />
          Pending Items
        </CardTitle>
        <CardDescription>
          Items awaiting your approval
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
                  <TableHead>Category</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item.productCode}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.item.description}</TableCell>
                    <TableCell>{item.item.brandCode}</TableCell>
                    <TableCell>{item.item.productCategory}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{item.requestedBy.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{format(new Date(item.requestedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.item.productCode}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/item-requests/${item.id}/approve`}>
                            Approve
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Pending Items</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              All items have been processed. Great job staying on top of approvals!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}