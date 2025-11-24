// File: components/items/edit-item-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImagePlus, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

// Import the Item interface from items-table.tsx to ensure consistency
interface ItemImage {
  id: string;
  itemId: string; // This is now the productCode
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  altText: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface Box {
  id: string;
  boxNumber: string;
  description: string | null;
  location: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface ItemStock {
  pending: number;
  id: string;
  itemId: string; // This is now the productCode
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
  boxId: string | null;
  condition: string;
  conditionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Item {
  productCode: string; // This is now the primary key
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  period: string;
  season: string;
  unitOfMeasure: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdByUser?: {
    id: string;
    name: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
  };
  images: ItemImage[];
  stock: ItemStock | null;
  box?: Box | null;
  location?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
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

export function EditItemModal({ isOpen, onClose, onSuccess, item }: EditItemModalProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productCodeError, setProductCodeError] = useState<string | null>(null);
  const [parsedProductCode, setParsedProductCode] = useState<ParsedProductCode | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]); // Added boxes state
  const [formData, setFormData] = useState({
    productCode: '',
    description: '',
    period: '',
    season: '',
    unitOfMeasure: 'PCS',
    condition: 'good',
    conditionNotes: '',
    boxId: '', // Changed from location to boxId
  });
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Fetch boxes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBoxes();
    }
  }, [isOpen]);

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes');
      if (response.ok) {
        const data = await response.json();
        setBoxes(data);
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        productCode: item.productCode,
        description: item.description,
        period: item.period,
        season: item.season,
        unitOfMeasure: item.unitOfMeasure,
        condition: item.stock?.condition || 'good',
        conditionNotes: item.stock?.conditionNotes || '',
        boxId: item.stock?.boxId || item.box?.id || 'none', // Use boxId from stock or box
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
      setError(null);
      setProductCodeError(null);
      
      // Parse the existing product code
      parseProductCode(item.productCode);
    }
  }, [isOpen, item]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
        setProductCodeError(parsed.error || 'Kode produk tidak valid');
      }
    } catch (error) {
      console.error('Error parsing product code:', error);
      setParsedProductCode(null);
      setProductCodeError('Gagal memproses kode produk');
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
          setError(`File ${file.name} terlalu besar. Ukuran maksimum adalah 5MB.`);
          continue;
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setError(`File ${file.name} bukan tipe gambar yang valid. Hanya JPEG, PNG, dan WebP yang diizinkan.`);
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
              altText: `${formData.description} - Gambar ${prev.length + 1}`,
              isPrimary: prev.length === 0,
              isNew: true,
            }]);
          } else {
            const errorData = await response.json().catch(() => ({}));
            setError(`Gagal mengunggah ${file.name}: ${errorData.error || 'Kesalahan server'}`);
          }
        } catch (fetchError) {
          setError(`Gagal mengunggah ${file.name}: Kesalahan jaringan`);
        }
      }
    } catch (error) {
      setError('Gagal mengunggah file. Silakan coba lagi.');
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
      setError('Kode produk diperlukan');
      return false;
    }
    
    if (productCodeError) {
      setError(productCodeError);
      return false;
    }
    
    if (!parsedProductCode) {
      setError('Silakan masukkan kode produk yang valid');
      return false;
    }
    
    if (!formData.description.trim()) {
      setError('Deskripsi diperlukan');
      return false;
    }
    
    if (!formData.period.trim()) {
      setError('Periode diperlukan');
      return false;
    }
    
    if (!formData.season) {
      setError('Musim diperlukan');
      return false;
    }
    
    if (!formData.unitOfMeasure) {
      setError('Satuan ukur diperlukan');
      return false;
    }
    
    if (!formData.condition) {
      setError('Kondisi diperlukan');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${item.productCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          period: formData.period,
          season: formData.season,
          unitOfMeasure: formData.unitOfMeasure,
          condition: formData.condition,
          conditionNotes: formData.conditionNotes,
          boxId: formData.boxId === 'none' ? null : formData.boxId, // Changed from location to boxId
          images: images,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal memperbarui item. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      setError('Gagal memperbarui item. Silakan periksa koneksi Anda dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the current user can edit this item
  const userRole = session?.user?.role;
  const isSuperAdmin = userRole === 'superadmin';
  const isItemMaster = userRole === 'item-master';
  
  // Super admins can edit any item regardless of status
  // Item masters can only edit items with pending_approval status
  const canEditItem = (isSuperAdmin || isItemMaster) && 
                      (isSuperAdmin || item?.status === 'pending_approval');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Perbarui informasi item. Isi semua field yang diperlukan.
            {isItemMaster && item?.status !== 'pending_approval' && (
              <span className="text-amber-600 block mt-1">
                Catatan: Sebagai Item Master, Anda hanya dapat mengedit item dengan status "Menunggu Persetujuan".
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!canEditItem && item && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isSuperAdmin 
                ? 'Anda tidak memiliki izin untuk mengedit item ini.'
                : 'Anda tidak memiliki izin untuk mengedit item ini. Hanya superadmin yang dapat mengedit item dengan status apa pun, dan item-master hanya dapat mengedit item dengan status "Menunggu Persetujuan".'
              }
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Kode Produk</Label>
              <div className="relative">
                <Input
                  id="productCode"
                  name="productCode"
                  value={formData.productCode}
                  onChange={handleInputChange}
                  required
                  disabled={true} // Disabled because it's the primary key
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
                  <p className="text-sm font-medium text-green-800">Kode Produk Valid</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Merek:</span> {parsedProductCode.brandName} ({parsedProductCode.brandCode})
                    </div>
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Divisi:</span> {parsedProductCode.divisionName} ({parsedProductCode.productDivision})
                    </div>
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Kategori:</span> {parsedProductCode.categoryName} ({parsedProductCode.productCategory})
                    </div>
                    <div className="text-xs text-green-700">
                      <span className="font-medium">Urutan:</span> {parsedProductCode.sequenceNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                disabled={!canEditItem}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Input
                id="period"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                placeholder="contoh: 24Q1"
                required
                disabled={!canEditItem}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Musim</Label>
              <Select 
                value={formData.season} 
                onValueChange={(value) => handleSelectChange('season', value)}
                disabled={!canEditItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih musim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SS">Spring/Summer</SelectItem>
                  <SelectItem value="FW">Fall/Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Satuan Ukur</Label>
              <Select 
                value={formData.unitOfMeasure} 
                onValueChange={(value) => handleSelectChange('unitOfMeasure', value)}
                disabled={!canEditItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih satuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                  <SelectItem value="PRS">Pairs (PRS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Kondisi</Label>
              <Select 
                value={formData.condition} 
                onValueChange={(value) => handleSelectChange('condition', value)}
                disabled={!canEditItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Sangat Baik</SelectItem>
                  <SelectItem value="good">Baik</SelectItem>
                  <SelectItem value="fair">Cukup</SelectItem>
                  <SelectItem value="poor">Buruk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="boxId">Kotak Penyimpanan</Label>
              <Select 
                value={formData.boxId} 
                onValueChange={(value) => handleSelectChange('boxId', value)}
                disabled={!canEditItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kotak" />
                </SelectTrigger>
                <SelectContent> 
                  <SelectItem value="none">Tidak Ada Kotak</SelectItem> */}
                  {/* {boxes.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.boxNumber} {box.location ? `(${box.location.name})` : ''}
                    </SelectItem>
                  ))} */}
                {/* </SelectContent>
              </Select>
            </div> */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="conditionNotes">Catatan Kondisi</Label>
              <Textarea
                id="conditionNotes"
                name="conditionNotes"
                value={formData.conditionNotes}
                onChange={handleInputChange}
                placeholder="Catatan tambahan tentang kondisi item"
                disabled={!canEditItem}
              />
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Gambar</Label>
              <div className="relative">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading || !canEditItem}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isUploading || !canEditItem}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Unggah Gambar
                    </>
                  )}
                </Button>
              </div>
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada gambar yang diunggah</p>
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
                        disabled={!canEditItem}
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
                          <Label htmlFor={`image-alt-${index}`}>Teks Alt</Label>
                          <Input
                            id={`image-alt-${index}`}
                            value={image.altText || ''}
                            onChange={(e) => handleImageChange(index, 'altText', e.target.value)}
                            placeholder="Deskripsi gambar"
                            disabled={!canEditItem}
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
                        disabled={!canEditItem}
                      />
                      <Label htmlFor={`image-primary-${index}`} className="text-sm">
                        Gambar Utama
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isUploading || !canEditItem || !parsedProductCode}
            >
              {isLoading ? 'Memperbarui...' : 'Perbarui Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}