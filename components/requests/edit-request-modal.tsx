'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Calendar, Info, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessages } from '@/hooks/use-messages';

interface Item {
  id: string;
  name: string;
  category: string;
  sizes: {
    size: string;
    available: number;
  }[];
}

interface BorrowRequest {
  id: string;
  item: Item;
  itemSize: {
    id: string;
    size: string;
    quantity: number;
    available: number;
  };
  quantity: number;
  startDate: string;
  endDate: string;
  reason: string;
}

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: BorrowRequest | null;
}

export function EditRequestModal({ isOpen, onClose, onSuccess, request }: EditRequestModalProps) {
  const { data: session } = useSession();
  const { addMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemId: '',
    size: '',
    quantity: 1,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [availableSizes, setAvailableSizes] = useState<{ size: string; available: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && request) {
      setFormData({
        itemId: request.item.id,
        size: request.itemSize.size,
        quantity: request.quantity,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
      });
      
      // Load available sizes for the current item
      const selectedItem = items.find(item => item.id === request.item.id);
      if (selectedItem) {
        setAvailableSizes(selectedItem.sizes);
      }
    }
  }, [isOpen, request, items]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        const availableItems = data.filter((item: Item) => 
          item.sizes.some(size => size.available > 0)
        );
        setItems(availableItems);
      } else {
        addMessage('error', 'Failed to fetch items', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      addMessage('error', 'Failed to fetch items', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemChange = (itemId: string) => {
    setFormData({ ...formData, itemId, size: '', quantity: 1 });
    
    const selectedItem = items.find(item => item.id === itemId);
    if (selectedItem) {
      setAvailableSizes(selectedItem.sizes);
    } else {
      setAvailableSizes([]);
    }
  };

  const handleSizeChange = (size: string) => {
    setFormData({ ...formData, size, quantity: 1 });
    
    const selectedSize = availableSizes.find(s => s.size === size);
    if (selectedSize) {
      // Set max quantity to the available amount for this size
      setFormData(prev => ({ ...prev, quantity: Math.min(prev.quantity, selectedSize.available) }));
    }
  };

  const handleQuantityChange = (quantity: number) => {
    const selectedSize = availableSizes.find(s => s.size === formData.size);
    if (selectedSize) {
      // Ensure quantity doesn't exceed available amount
      const maxQuantity = selectedSize.available;
      setFormData({ ...formData, quantity: Math.min(quantity, maxQuantity) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        addMessage('success', 'Request updated successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to update request', 'Error');
      }
    } catch (error) {
      console.error('Failed to update request:', error);
      addMessage('error', 'Failed to update request', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Edit Borrow Request</CardTitle>
              <CardDescription>
                Update the details of this borrow request
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                Select Item *
              </label>
              <select
                id="item"
                value={formData.itemId}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
                disabled={isSubmitting || isLoading}
              >
                <option value="">Select an item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
            </div>
            
            {formData.itemId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <select
                    id="size"
                    value={formData.size}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a size</option>
                    {availableSizes.map((size) => (
                      <option key={size.size} value={size.size}>
                        {size.size} ({size.available} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={today}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || today}
                  max={maxDate}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Borrowing *
              </label>
              <textarea
                id="reason"
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Explain why you need to borrow this item..."
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                type="submit" 
                className="bg-primary-500 hover:bg-primary-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Request'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}