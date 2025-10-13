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
import { useSession } from 'next-auth/react';
import { ImagePlus, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

interface ParsedProductCode {
  brandCode: string;
  brandName: string;
  productDivision: string;
  divisionName: string;
  productCategory: string;
  categoryName: string;
  sequenceNumber: string;
  isValid: boolean;
  error?: string;
}

export function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productCodeError, setProductCodeError] = useState<string | null>(null);
  const [parsedProductCode, setParsedProductCode] = useState<ParsedProductCode | null>(null);
  const [formData, setFormData] = useState({
    productCode: '',
    description: '',
    inventory: 0,
    period: '',
    season: '',
    unitOfMeasure: 'PCS',
    condition: 'good',
    conditionNotes: '',
  });
  const [images, setImages] = useState<UploadedImage[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        productCode: '',
        description: '',
        inventory: 0,
        period: '',
        season: '',
        unitOfMeasure: 'PCS',
        condition: 'good',
        conditionNotes: '',
      });
      setImages([]);
      setError(null);
      setProductCodeError(null);
      setParsedProductCode(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'inventory' ? parseInt(value) || 0 : value,
    }));
    
    // If product code is changed, parse it
    if (name === 'productCode') {
      parseProductCode(value);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const parseProductCode = async (code: string) => {
    if (!code.trim()) {
      setProductCodeError(null);
      setParsedProductCode(null);
      return;
    }

    try {
      // Import the parseProductCode function from the schema
      const { parseProductCode: parseCode } = await import('@/lib/db/schema');
      const parsed = parseCode(code);
      
      if (parsed.isValid) {
        setParsedProductCode(parsed);
        setProductCodeError(null);
      } else {
        setParsedProductCode(null);
        setProductCodeError(parsed.error || 'Invalid product code');
      }
    } catch (error) {
      console.error('Error parsing product code:', error);
      setParsedProductCode(null);
      setProductCodeError('Failed to parse product code');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    
    try {
      for (const file of files) {
        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          setError(`File ${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setError(`File ${file.name} is not a valid image type. Only JPEG, PNG, and WebP are allowed.`);
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('sku', formData.productCode);

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          if (response.ok) {
            const uploadedFile = await response.json();
            setImages(prev => [...prev, {
              ...uploadedFile,
              altText: `${formData.description} - Image ${prev.length + 1}`,
              isPrimary: prev.length === 0,
            }]);
          } else {
            const errorData = await response.json().catch(() => ({}));
            setError(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`);
          }
        } catch (fetchError) {
          setError(`Failed to upload ${file.name}: Network error`);
        }
      }
    } catch (error) {
      setError('Failed to upload files. Please try again.');
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

  const validateForm = () => {
    if (!formData.productCode.trim()) {
      setError('Product Code is required');
      return false;
    }
    
    if (productCodeError) {
      setError(productCodeError);
      return false;
    }
    
    if (!parsedProductCode) {
      setError('Please enter a valid product code');
      return false;
    }
    
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    
    if (!formData.period.trim()) {
      setError('Period is required');
      return false;
    }
    
    if (!formData.season) {
      setError('Season is required');
      return false;
    }
    
    if (!formData.unitOfMeasure) {
      setError('Unit of Measure is required');
      return false;
    }
    
    if (!formData.condition) {
      setError('Condition is required');
      return false;
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
      setError('Failed to add item. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new item to the inventory. Fill in all the required information.
            The item will be submitted for approval by the Storage Master.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Product Code</Label>
              <div className="relative">
                <Input
                  id="productCode"
                  name="productCode"
                  value={formData.productCode}
                  onChange={handleInputChange}
                  required
                  className={productCodeError ? "border-red-500" : parsedProductCode ? "border-green-500" : ""}
                />
                {parsedProductCode && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
                {productCodeError && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                )}
              </div>
              {productCodeError && (
                <p className="text-sm text-red-500">{productCodeError}</p>
              )}
              {parsedProductCode && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-green-800">Valid Product Code</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Brand:</span> {parsedProductCode.brandName} ({parsedProductCode.brandCode})
                    </div>
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Division:</span> {parsedProductCode.divisionName} ({parsedProductCode.productDivision})
                    </div>
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Category:</span> {parsedProductCode.categoryName} ({parsedProductCode.productCategory})
                    </div>
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Sequence:</span> {parsedProductCode.sequenceNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
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
            <Button type="submit" disabled={isLoading || isUploading || !parsedProductCode}>
              {isLoading ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}