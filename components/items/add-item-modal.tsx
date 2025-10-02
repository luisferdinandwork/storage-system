// components/items/add-item-modal.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemForm {
  name: string;
  description: string;
  category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
  size: string;
  quantity: number;
}

export function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ItemForm>({
    name: '',
    description: '',
    category: 'shoes',
    size: '',
    quantity: 1
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        category: 'shoes',
        size: '',
        quantity: 1
      });
    }
  }, [isOpen]);

  const getSizeOptions = (category: string) => {
    switch (category) {
      case 'shoes':
        return ['US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12'];
      case 'apparel':
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'];
      case 'accessories':
        return ['One Size', 'S', 'M', 'L', '34', '36', '38', '40'];
      case 'equipment':
        return ['Standard', 'Small', 'Medium', 'Large', 'X-Large', '2 Person', '4 Person', '6 Person'];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/items', {
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
        alert(error.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ItemForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category: category as any,
      size: '' // Reset size when category changes
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Item"
      description="Fill in the details to add a new item to the inventory"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            disabled={isSubmitting}
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            disabled={isSubmitting}
            placeholder="Enter item description (optional)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            >
              <option value="shoes">Shoes</option>
              <option value="apparel">Apparel</option>
              <option value="accessories">Accessories</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
              Size *
            </label>
            <select
              id="size"
              value={formData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            >
              <option value="">Select a size</option>
              {getSizeOptions(formData.category).map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
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
            onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
            required
            disabled={isSubmitting}
            placeholder="Enter quantity"
          />
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}