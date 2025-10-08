// File: components/items/borrow-item-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Package, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Item {
  id: string;
  productCode: string;
  description: string;
  brandCode: string;
  productGroup: string;
  productDivision: string;
  productCategory: string;
  inventory: number;
  vendor: string;
  period: string;
  season: string;
  gender: string;
  mould: string;
  tier: string;
  silo: string;
  location: string;
  unitOfMeasure: string;
  condition: string;
  conditionNotes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    itemId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    altText: string | null;
    isPrimary: boolean;
    createdAt: string;
  }[];
}

interface BorrowItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: Item | null;
}

export function BorrowItemModal({ isOpen, onClose, onSuccess, item }: BorrowItemModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setReason('');
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || !startDate || !endDate || !reason) {
      setError('All fields are required');
      return;
    }

    if (item.inventory < quantity) {
      setError('Not enough items available');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      setError('Start date cannot be in the past');
      return;
    }

    if (end <= start) {
      setError('End date must be after start date');
      return;
    }

    const maxEndDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (end > maxEndDate) {
      setError('Maximum borrowing period is 14 days');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          quantity: parseInt(quantity.toString()),
          startDate,
          endDate,
          reason,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create borrow request');
      }
    } catch (error) {
      setError('Failed to create borrow request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'LST':
        return 'bg-blue-100 text-blue-800';
      case 'PRF':
        return 'bg-green-100 text-green-800';
      case 'SLR':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUnitDisplay = (unit: string) => {
    switch (unit) {
      case 'PCS':
        return 'Pieces';
      case 'PRS':
        return 'Pairs';
      default:
        return unit;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Borrow Item</DialogTitle>
          <DialogDescription>
            Fill in the details to borrow this item.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center mb-2">
            <Package className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="font-medium">{item.description}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.productCategory)}`}>
              {item.productCategory === 'LST' ? 'Lifestyle' : 
               item.productCategory === 'PRF' ? 'Performance' : 'Slider'}
            </span>
            <span className="text-sm text-gray-600">
              {item.productCode} | {getUnitDisplay(item.unitOfMeasure)}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <span className="text-sm text-gray-600">
              Available: {item.inventory} {getUnitDisplay(item.unitOfMeasure)}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={item.inventory}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {item.inventory} {getUnitDisplay(item.unitOfMeasure)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for borrowing this item..."
              rows={3}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || item.inventory === 0}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}