// components/items/bulk-clearance-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

export interface BulkClearanceItem {
  itemId: string;
  productCode: string;
  description: string;
  availableStock: number;
  quantity: number;
}

interface BulkClearanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: BulkClearanceItem[];
  onConfirm: (items: BulkClearanceItem[], reason: string) => void;
  isProcessing: boolean;
}

export function BulkClearanceDialog({
  open,
  onOpenChange,
  selectedItems,
  onConfirm,
  isProcessing,
}: BulkClearanceDialogProps) {
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<BulkClearanceItem[]>(selectedItems);

  // Update internal items state when selectedItems prop changes
  useEffect(() => {
    setItems(selectedItems);
  }, [selectedItems]);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.itemId === itemId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.availableStock)) }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.itemId !== itemId));
  };

  const isValid = items.length > 0 && reason.trim() !== '' && items.every(item => item.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Items to Clearance</DialogTitle>
          <DialogDescription>
            Select the quantity of each item to move to inventory clearance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Clearance Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for clearance..."
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Items to Clear</Label>
            <div className="mt-2 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Available Stock</TableHead>
                    <TableHead>Quantity to Clear</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productCode}</div>
                            <div className="text-sm text-gray-500">{item.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.availableStock}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.availableStock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(item.itemId, parseInt(e.target.value) || 0)
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.itemId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                        No items selected for clearance
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(items, reason)} 
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Move to Clearance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}