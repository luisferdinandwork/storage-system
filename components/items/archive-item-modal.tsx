// components/items/archive-item-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface ArchiveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: Item | null;
}

export function ArchiveItemModal({ isOpen, onClose, onSuccess, item }: ArchiveItemModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for archiving');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${item?.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to archive item');
      }
    } catch (error) {
      console.error('Failed to archive item:', error);
      setError('Failed to archive item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Archive Item</DialogTitle>
          <DialogDescription>
            This will archive the item and move it to the archived status. The item will no longer be available for borrowing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="font-medium">{item.description}</div>
          <div className="text-sm text-gray-600">Product Code: {item.productCode}</div>
          <div className="text-sm text-gray-600">Inventory: {item.inventory}</div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for archiving
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for archiving this item..."
              rows={3}
              className="mt-1"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}