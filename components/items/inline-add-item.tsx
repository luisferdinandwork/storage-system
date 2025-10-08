// File: components/items/inline-add-item.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from 'next-auth/react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InlineAddItemProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface UploadedImage {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

export function InlineAddItem({ onSuccess, onCancel }: InlineAddItemProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    productCode: '',
    description: '',
    brandCode: '',
    productGroup: '',
    productDivision: '',
    productCategory: '',
    inventory: 0,
    vendor: '',
    period: '',
    season: '',
    gender: '',
    mould: '',
    tier: '',
    silo: '',
    location: 'Storage 1',
    unitOfMeasure: 'PCS',
    condition: 'good',
    conditionNotes: '',
  });
  const [images, setImages] = useState<UploadedImage[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'inventory' ? parseInt(value) || 0 : value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user makes selection
    if (error) setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File ${file.name} is not a valid image type. Only JPEG, PNG, and WebP are allowed.`);
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('sku', formData.productCode || 'temp');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`);
      }

      return await response.json();
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      setImages(prev => [
        ...prev,
        ...uploadedFiles.map((file, index) => ({
          ...file,
          altText: `${formData.description || 'Item'} - Image ${prev.length + index + 1}`,
          isPrimary: prev.length === 0 && index === 0,
        }))
      ]);
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleImageChange = (index: number, field: string, value: string | boolean) => {
    setImages(prev => {
      const updatedImages = [...prev];
      updatedImages[index] = { ...updatedImages[index], [field]: value };
      
      // If setting isPrimary to true, set all others to false
      if (field === 'isPrimary' && value === true) {
        return updatedImages.map((img, i) => ({
          ...img,
          isPrimary: i === index,
        }));
      }
      
      return updatedImages;
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const updatedImages = prev.filter((_, i) => i !== index);
      // If we removed the primary image, make the first one primary
      if (prev[index].isPrimary && updatedImages.length > 0) {
        updatedImages[0] = { ...updatedImages[0], isPrimary: true };
      }
      return updatedImages;
    });
  };

  const validateForm = () => {
    const requiredFields = [
      { field: 'productCode', label: 'Product Code' },
      { field: 'description', label: 'Description' },
      { field: 'brandCode', label: 'Brand Code' },
      { field: 'productGroup', label: 'Product Group' },
      { field: 'productDivision', label: 'Product Division' },
      { field: 'productCategory', label: 'Product Category' },
      { field: 'vendor', label: 'Vendor' },
      { field: 'period', label: 'Period' },
      { field: 'season', label: 'Season' },
      { field: 'gender', label: 'Gender' },
      { field: 'mould', label: 'Mould' },
      { field: 'tier', label: 'Tier' },
      { field: 'silo', label: 'Silo' },
    ];

    for (const { field, label } of requiredFields) {
      const value = formData[field as keyof typeof formData];
      if (!value || (typeof value === 'string' && !value.trim())) {
        setError(`${label} is required`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          images: images,
        }),
      });
      
      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add item. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      setError('Failed to add item. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-blue-50 border-b">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-blue-900">Add New Item</h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Product Code *</Label>
              <Input
                id="productCode"
                name="productCode"
                value={formData.productCode}
                onChange={handleInputChange}
                placeholder="e.g., ABC-123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Product description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandCode">Brand Code *</Label>
              <Input
                id="brandCode"
                name="brandCode"
                value={formData.brandCode}
                onChange={handleInputChange}
                placeholder="Brand code"
              />
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Product Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productGroup">Product Group *</Label>
              <Input
                id="productGroup"
                name="productGroup"
                value={formData.productGroup}
                onChange={handleInputChange}
                placeholder="Product group"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDivision">Product Division *</Label>
              <Input
                id="productDivision"
                name="productDivision"
                value={formData.productDivision}
                onChange={handleInputChange}
                placeholder="Product division"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCategory">Category *</Label>
              <Select value={formData.productCategory} onValueChange={(value) => handleSelectChange('productCategory', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LST">Lifestyle</SelectItem>
                  <SelectItem value="PRF">Performance</SelectItem>
                  <SelectItem value="SLR">Slider</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Product Attributes */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Product Attributes</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period *</Label>
              <Input
                id="period"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                placeholder="e.g., FW24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Season *</Label>
              <Select value={formData.season} onValueChange={(value) => handleSelectChange('season', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men">Men</SelectItem>
                  <SelectItem value="Women">Women</SelectItem>
                  <SelectItem value="Unisex">Unisex</SelectItem>
                  <SelectItem value="Kids">Kids</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mould">Mould *</Label>
              <Input
                id="mould"
                name="mould"
                value={formData.mould}
                onChange={handleInputChange}
                placeholder="Mould"
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Classification</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tier">Tier *</Label>
              <Select value={formData.tier} onValueChange={(value) => handleSelectChange('tier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="silo">Silo *</Label>
              <Select value={formData.silo} onValueChange={(value) => handleSelectChange('silo', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select silo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Input
                id="vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                placeholder="Vendor name"
              />
            </div>
          </div>
        </div>

        {/* Inventory & Storage */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Inventory & Storage</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory *</Label>
              <Input
                id="inventory"
                name="inventory"
                type="number"
                min="0"
                value={formData.inventory}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select value={formData.location} onValueChange={(value) => handleSelectChange('location', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Storage 1">Storage 1</SelectItem>
                  <SelectItem value="Storage 2">Storage 2</SelectItem>
                  <SelectItem value="Storage 3">Storage 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Unit *</Label>
              <Select value={formData.unitOfMeasure} onValueChange={(value) => handleSelectChange('unitOfMeasure', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                  <SelectItem value="PRS">Pairs (PRS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select value={formData.condition} onValueChange={(value) => handleSelectChange('condition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditionNotes">Condition Notes (Optional)</Label>
            <Textarea
              id="conditionNotes"
              name="conditionNotes"
              value={formData.conditionNotes}
              onChange={handleInputChange}
              placeholder="Additional notes about the item's condition..."
              rows={2}
            />
          </div>
        </div>

        {/* Images Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Images (Optional)</h4>
            <div className="relative">
              <input
                type="file"
                id="image-upload"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Images
                  </>
                )}
              </Button>
            </div>
          </div>
          {images.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No images uploaded yet</p>
              <p className="text-xs text-gray-400">JPEG, PNG, WebP (max 5MB each)</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {images.map((image, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={image.url} 
                        alt={image.altText || 'Preview'} 
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{image.originalName}</p>
                        <p className="text-xs text-gray-500">{(image.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`image-alt-${index}`}>Alt Text</Label>
                    <Input
                      id={`image-alt-${index}`}
                      value={image.altText || ''}
                      onChange={(e) => handleImageChange(index, 'altText', e.target.value)}
                      placeholder="Image description"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`image-primary-${index}`}
                      checked={image.isPrimary || false}
                      onChange={(e) => handleImageChange(index, 'isPrimary', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={`image-primary-${index}`} className="text-sm font-normal cursor-pointer">
                      Set as primary image
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isUploading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Item...
              </>
            ) : (
              'Add Item'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}