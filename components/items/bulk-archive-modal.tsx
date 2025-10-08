// components/items/bulk-archive-modal.tsx
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

interface BulkArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItems: string[];
}

export function BulkArchiveModal({ isOpen, onClose, onSuccess, selectedItems }: BulkArchiveModalProps) {
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
      const response = await fetch('/api/items/bulk-archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemIds: selectedItems,
          reason: reason.trim() 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to archive items');
      }
    } catch (error) {
      console.error('Failed to bulk archive items:', error);
      setError('Failed to archive items');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Bulk Archive Items</DialogTitle>
          <DialogDescription>
            This will archive {selectedItems.length} items and move them to the archived status. The items will no longer be available for borrowing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium">Items to archive: {selectedItems.length}</p>
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
              placeholder="Enter reason for archiving these items..."
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
              {isSubmitting ? 'Archiving...' : 'Archive Items'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}