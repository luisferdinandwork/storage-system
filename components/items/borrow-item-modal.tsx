// components/request/borrow-item-modal.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Package, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ItemSize {
  id: string;
  size: string;
  quantity: number;
  available: number;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
  sizes: ItemSize[];
}

interface BorrowItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: Item | null;
}

export function BorrowItemModal({ isOpen, onClose, onSuccess, item }: BorrowItemModalProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
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
    if (item && item.sizes.length > 0) {
      setSelectedSizeId(item.sizes[0].id);
      setQuantity(1);
      setReason('');
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const selectedSize = item.sizes.find(size => size.id === selectedSizeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSizeId || !quantity || !startDate || !endDate || !reason) {
      setError('All fields are required');
      return;
    }

    if (!selectedSize || selectedSize.available < quantity) {
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
          itemSizeId: selectedSizeId,
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
      case 'shoes':
        return 'bg-blue-100 text-blue-800';
      case 'apparel':
        return 'bg-green-100 text-green-800';
      case 'accessories':
        return 'bg-purple-100 text-purple-800';
      case 'equipment':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Borrow Item</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center mb-2">
            <Package className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="font-medium">{item.name}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </span>
            {item.description && (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="size">Size</Label>
            <select
              id="size"
              value={selectedSizeId}
              onChange={(e) => setSelectedSizeId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {item.sizes.map((size) => (
                <option key={size.id} value={size.id} disabled={size.available === 0}>
                  {size.size} - {size.available} of {size.quantity} available
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedSize?.available || 1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {selectedSize?.available || 0}
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedSize || selectedSize.available === 0}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}