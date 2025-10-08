// File: components/items/edit-item-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, X, Upload } from 'lucide-react';

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

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: Item | null;
}

interface UploadedImage {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  altText?: string;
  isPrimary?: boolean;
  isNew?: boolean; // Flag to track newly uploaded images
}

export function EditItemModal({ isOpen, onClose, onSuccess, item }: EditItemModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        productCode: item.productCode,
        description: item.description,
        brandCode: item.brandCode,
        productGroup: item.productGroup,
        productDivision: item.productDivision,
        productCategory: item.productCategory,
        inventory: item.inventory,
        vendor: item.vendor,
        period: item.period,
        season: item.season,
        gender: item.gender,
        mould: item.mould,
        tier: item.tier,
        silo: item.silo,
        location: item.location,
        unitOfMeasure: item.unitOfMeasure,
        condition: item.condition,
        conditionNotes: item.conditionNotes || '',
      });
      
      // Convert existing images to the format expected by the form
      const existingImages = item.images.map(img => ({
        fileName: img.fileName,
        originalName: img.originalName,
        mimeType: img.mimeType,
        size: img.size,
        url: `/uploads/${img.fileName}`,
        altText: img.altText || '',
        isPrimary: img.isPrimary,
        isNew: false,
      }));
      setImages(existingImages);
    }
  }, [isOpen, item]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'inventory' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // In the handleFileUpload function of EditItemModal

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  setIsUploading(true);
  
  try {
    for (const file of files) {
      const uploadFormData = new FormData(); // Rename to avoid conflict
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const uploadedFile = await response.json();
        setImages(prev => [...prev, {
          ...uploadedFile,
          altText: `${formData.description} - Image ${prev.length + 1}`, // Use component's formData
          isPrimary: prev.length === 0,
          isNew: true,
        }]);
      } else {
        console.error('Failed to upload file:', file.name);
      }
    }
  } catch (error) {
    console.error('Error uploading files:', error);
  } finally {
    setIsUploading(false);
    // Clear the input
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    setIsLoading(true);

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
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
        const error = await response.json();
        console.error('Failed to update item:', error);
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the item information. Fill in all the required fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Product Code</Label>
              <Input
                id="productCode"
                name="productCode"
                value={formData.productCode}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandCode">Brand Code</Label>
              <Input
                id="brandCode"
                name="brandCode"
                value={formData.brandCode}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productGroup">Product Group</Label>
              <Input
                id="productGroup"
                name="productGroup"
                value={formData.productGroup}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDivision">Product Division</Label>
              <Input
                id="productDivision"
                name="productDivision"
                value={formData.productDivision}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCategory">Product Category</Label>
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
            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory</Label>
              <Input
                id="inventory"
                name="inventory"
                type="number"
                min="0"
                value={formData.inventory}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                placeholder="e.g., 24Q1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Select value={formData.season} onValueChange={(value) => handleSelectChange('season', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SS">Spring/Summer</SelectItem>
                  <SelectItem value="FW">Fall/Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Men</SelectItem>
                  <SelectItem value="W">Women</SelectItem>
                  <SelectItem value="U">Unisex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mould">Mould</Label>
              <Input
                id="mould"
                name="mould"
                value={formData.mould}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select value={formData.tier} onValueChange={(value) => handleSelectChange('tier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRO">Professional</SelectItem>
                  <SelectItem value="STD">Standard</SelectItem>
                  <SelectItem value="ECO">Economy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="silo">Silo</Label>
              <Select value={formData.silo} onValueChange={(value) => handleSelectChange('silo', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select silo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIFESTYLE">Lifestyle</SelectItem>
                  <SelectItem value="SPORTS">Sports</SelectItem>
                  <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
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
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
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
              <Label htmlFor="condition">Condition</Label>
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="conditionNotes">Condition Notes</Label>
              <Textarea
                id="conditionNotes"
                name="conditionNotes"
                value={formData.conditionNotes}
                onChange={handleInputChange}
                placeholder="Additional notes about the item condition"
              />
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Images</Label>
              <div className="relative">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
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
              <p className="text-sm text-gray-500">No images uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div key={index} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{image.originalName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <img 
                        src={image.url} 
                        alt={image.altText || 'Preview'} 
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div>
                          <Label htmlFor={`image-alt-${index}`}>Alt Text</Label>
                          <Input
                            id={`image-alt-${index}`}
                            value={image.altText || ''}
                            onChange={(e) => handleImageChange(index, 'altText', e.target.value)}
                            placeholder="Image description"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`image-primary-${index}`}
                        checked={image.isPrimary || false}
                        onChange={(e) => handleImageChange(index, 'isPrimary', e.target.checked)}
                      />
                      <Label htmlFor={`image-primary-${index}`} className="text-sm">
                        Primary Image
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? 'Updating...' : 'Update Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}