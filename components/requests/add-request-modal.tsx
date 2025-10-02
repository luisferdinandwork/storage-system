// components/requests/add-request-modal.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface AddRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RequestForm {
  itemId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface AvailableItem {
  id: string;
  name: string;
  category: string;
  size: string;
  available: number;
}

export function AddRequestModal({ isOpen, onClose, onSuccess }: AddRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<AvailableItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [formData, setFormData] = useState<RequestForm>({
    itemId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Calculate min and max dates
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch available items when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        itemId: '',
        startDate: '',
        endDate: '',
        reason: ''
      });
    }
  }, [isOpen]);

  const fetchItems = async () => {
    setIsLoadingItems(true);
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data.filter((item: any) => item.available > 0));
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RequestForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartDateChange = (startDate: string) => {
    setFormData(prev => ({
      ...prev,
      startDate,
      endDate: prev.endDate < startDate ? startDate : prev.endDate
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Borrow Request"
      description="Request to borrow an item for a maximum of 14 days"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
            Select Item *
          </label>
          {isLoadingItems ? (
            <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50">
              <span className="text-gray-500">Loading available items...</span>
            </div>
          ) : (
            <select
              id="item"
              value={formData.itemId}
              onChange={(e) => handleInputChange('itemId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category}, Size: {item.size}) - {item.available} available
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
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
              onChange={(e) => handleInputChange('endDate', e.target.value)}
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
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={4}
            required
            disabled={isSubmitting}
            placeholder="Explain why you need to borrow this item..."
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Maximum borrowing period is 14 days. Your request will require approval from both a manager and an admin.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary-500 hover:bg-primary-600"
            disabled={isSubmitting || isLoadingItems}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}