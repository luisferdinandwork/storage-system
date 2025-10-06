import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessages } from '@/hooks/use-messages';

interface ItemSize {
  id?: string;
  size: string;
  quantity: number;
  available?: number;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
  sizes: ItemSize[];
}

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: Item | null;
}

interface ItemForm {
  name: string;
  description: string;
  category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
  sizes: ItemSize[];
}

export function EditItemModal({ isOpen, onClose, onSuccess, item }: EditItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addMessage } = useMessages();
  const [formData, setFormData] = useState<ItemForm>({
    name: '',
    description: '',
    category: 'shoes',
    sizes: [{ size: '', quantity: 1 }]
  });

  // Load item data when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        name: item.name,
        description: item.description || '',
        category: item.category,
        sizes: item.sizes.map(s => ({
          id: s.id,
          size: s.size,
          quantity: s.quantity,
          available: s.available
        }))
      });
    }
  }, [isOpen, item]);

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
    
    if (!item) return;
    
    // Validate form
    if (!formData.name.trim()) {
      addMessage('warning', 'Please enter an item name', 'Validation Error');
      return;
    }
    
    if (formData.sizes.some(s => !s.size.trim() || s.quantity <= 0)) {
      addMessage('warning', 'Please ensure all sizes have a valid size and quantity', 'Validation Error');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        addMessage('success', 'Item updated successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to update item', 'Error');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      addMessage('error', 'Failed to update item', 'Error');
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
      sizes: [{ size: '', quantity: 1 }] // Reset sizes when category changes
    }));
  };

  const handleSizeChange = (index: number, field: 'size' | 'quantity', value: string | number) => {
    const newSizes = [...formData.sizes];
    newSizes[index] = {
      ...newSizes[index],
      [field]: field === 'quantity' ? parseInt(value as string) || 1 : value
    };
    setFormData(prev => ({
      ...prev,
      sizes: newSizes
    }));
  };

  const addSizeRow = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { size: '', quantity: 1 }]
    }));
  };

  const removeSizeRow = (index: number) => {
    if (formData.sizes.length > 1) {
      const newSizes = [...formData.sizes];
      newSizes.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        sizes: newSizes
      }));
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Item"
      description="Update the item details"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            disabled={isSubmitting}
            placeholder="Enter item name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            disabled={isSubmitting}
            placeholder="Enter item description (optional)"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
          <div className="flex justify-between items-center mb-2">
            <Label>Sizes *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSizeRow}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Size
            </Button>
          </div>
          
          <div className="space-y-2">
            {formData.sizes.map((sizeItem, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <select
                    value={sizeItem.size}
                    onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a size</option>
                    {getSizeOptions(formData.category).map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    value={sizeItem.quantity}
                    onChange={(e) => handleSizeChange(index, 'quantity', e.target.value)}
                    required
                    disabled={isSubmitting}
                    placeholder="Qty"
                  />
                </div>
                
                {formData.sizes.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSizeRow(index)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {formData.sizes.some(s => s.available !== undefined && s.available < s.quantity) && (
            <p className="text-xs text-amber-600 mt-2">
              Note: Some sizes have items currently borrowed. Reducing quantity will only affect available stock.
            </p>
          )}
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
            {isSubmitting ? 'Updating...' : 'Update Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}