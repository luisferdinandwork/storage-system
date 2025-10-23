// components/items/clearance-details-modal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ItemClearance {
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
}

interface ItemStock {
  id: string;
  itemId: string;
  pending: number;
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
  location: string | null;
  condition: string;
  conditionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Item {
  id: string;
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
  stock: ItemStock | null;
  clearances: ItemClearance[];
}

interface ClearanceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

export function ClearanceDetailsModal({
  open,
  onOpenChange,
  item,
}: ClearanceDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!item) return null;

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return <Badge variant="default">Excellent</Badge>;
      case 'good':
        return <Badge variant="secondary">Good</Badge>;
      case 'fair':
        return <Badge variant="outline">Fair</Badge>;
      case 'poor':
        return <Badge variant="destructive">Poor</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRevertFromClearance = async () => {
    if (!item.stock) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/items/revert-from-clearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          quantity: item.stock.inClearance,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Revert successful:', result);
        onOpenChange(false);
        // You might want to show a success message or refresh the data
      } else {
        const error = await response.json();
        console.error('Failed to revert from clearance:', error);
        // You might want to show an error message
      }
    } catch (error) {
      console.error('Error reverting from clearance:', error);
      // You might want to show an error message
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentClearance = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/items/permanent-clearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Permanent clearance successful:', result);
        onOpenChange(false);
        // You might want to show a success message or refresh the data
      } else {
        const error = await response.json();
        console.error('Failed to permanently clear item:', error);
        // You might want to show an error message
      }
    } catch (error) {
      console.error('Error permanently clearing item:', error);
      // You might want to show an error message
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Clearance Details - {item.productCode}
          </DialogTitle>
          <DialogDescription>
            {item.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clearances">Clearance History</TabsTrigger>
            <TabsTrigger value="stock">Stock Information</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Product Code</h3>
                <p className="text-lg">{item.productCode}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Brand</h3>
                <p className="text-lg">{item.brandCode}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Division</h3>
                <p className="text-lg">{item.productDivision}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                <p className="text-lg">{item.productCategory}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Period</h3>
                <p className="text-lg">{item.period}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Season</h3>
                <p className="text-lg">{item.season}</p>
              </div>
            </div>

            {item.stock && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Pending Stock</h3>
                  <p className="text-lg">{item.stock.pending}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">In Storage</h3>
                  <p className="text-lg">{item.stock.inStorage}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">On Borrow</h3>
                  <p className="text-lg">{item.stock.onBorrow}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">In Clearance</h3>
                  <p className="text-lg">{item.stock.inClearance}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Condition</h3>
                  <div className="mt-1">{getConditionBadge(item.stock.condition)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                  <p className="text-lg">{item.stock.location || 'Not assigned'}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clearances">
            {item.clearances && item.clearances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.clearances.map((clearance) => (
                    <TableRow key={clearance.id}>
                      <TableCell>
                        {format(new Date(clearance.requestedAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{clearance.quantity}</TableCell>
                      <TableCell>{clearance.reason}</TableCell>
                      <TableCell>{getStatusBadge(clearance.status)}</TableCell>
                      <TableCell>{clearance.requestedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No clearance records found for this item.
              </p>
            )}
          </TabsContent>

          <TabsContent value="stock">
            {item.stock ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Stock ID</h3>
                    <p className="text-sm">{item.stock.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                    <p className="text-sm">
                      {format(new Date(item.stock.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                    <p className="text-sm">
                      {format(new Date(item.stock.updatedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Condition Notes</h3>
                    <p className="text-sm">
                      {item.stock.conditionNotes || 'No notes'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No stock information available for this item.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleRevertFromClearance}
              disabled={isProcessing}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert from Clearance
            </Button>
            <Button 
              variant="destructive" 
              onClick={handlePermanentClearance}
              disabled={isProcessing}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Permanent Clearance
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}