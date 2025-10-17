'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageContainer } from '@/components/ui/message';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useMessages } from '@/hooks/use-messages';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Package,
  Warehouse,
  Image,
  Archive,
  Truck,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalBadge } from '@/components/ui/universal-badge';

interface Item {
  id: string;
  productCode: string;
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  totalStock: number;
  period: string;
  season: string;
  unitOfMeasure: string;
  status: 'pending_approval' | 'approved' | 'rejected';
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
  stock: {
    id: string;
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    location: string | null;
    condition: string;
    conditionNotes: string | null;
  } | null;
}

export default function StockLocationsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchStockItems();
  }, [searchTerm, locationFilter]);

  const fetchStockItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter !== 'all') params.append('location', locationFilter);
      
      const response = await fetch(`/api/stock-items?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        addMessage('error', 'Failed to fetch stock items', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch stock items:', error);
      addMessage('error', 'Failed to fetch stock items', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleViewImages = (item: Item) => {
    setSelectedItem(item);
    setSelectedImageIndex(0);
    setShowImagesModal(true);
  };

  const getPrimaryImage = (images: any[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  // Calculate stock summary
  const totalInStorage = items.reduce((sum, item) => sum + (item.stock?.inStorage || 0), 0);
  const totalOnBorrow = items.reduce((sum, item) => sum + (item.stock?.onBorrow || 0), 0);
  const totalInClearance = items.reduce((sum, item) => sum + (item.stock?.inClearance || 0), 0);
  const totalSeeded = items.reduce((sum, item) => sum + (item.stock?.seeded || 0), 0);

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Locations</h1>
          <p className="text-gray-600 mt-1">View and manage item stock across all locations</p>
        </div>
      </div>

      {/* Stock Summary Cards with Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Archive className="mr-2 h-5 w-5 text-blue-500" />
              In Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalInStorage}</div>
            <p className="text-xs text-muted-foreground">Items currently in storage</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Truck className="mr-2 h-5 w-5 text-green-500" />
              On Borrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalOnBorrow}</div>
            <p className="text-xs text-muted-foreground">Items currently borrowed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <RefreshCw className="mr-2 h-5 w-5 text-orange-500" />
              In Clearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalInClearance}</div>
            <p className="text-xs text-muted-foreground">Items in clearance process</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-purple-500" />
              Seeded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalSeeded}</div>
            <p className="text-xs text-muted-foreground">Items seeded for display</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Locations</option>
            <option value="Storage 1">Storage 1</option>
            <option value="Storage 2">Storage 2</option>
            <option value="Storage 3">Storage 3</option>
            <option value="">Not Assigned</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>In Storage</TableHead>
                <TableHead>On Borrow</TableHead>
                <TableHead>In Clearance</TableHead>
                <TableHead>Seeded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {item.images && item.images.length > 0 && (
                          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={getPrimaryImage(item.images).fileName ? `/uploads/${getPrimaryImage(item.images).fileName}` : '/placeholder.jpg'} 
                              alt={getPrimaryImage(item.images).altText || item.description}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      <div className="flex flex-col min-w-0">
                        <div className="font-bold text-sm">{item.productCode}</div>
                        <div className="text-sm text-gray-600 truncate">{item.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">{item.stock?.inStorage || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">{item.stock?.onBorrow || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-orange-600">{item.stock?.inClearance || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-purple-600">{item.stock?.seeded || 0}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        {item.images && item.images.length > 0 && (
                          <DropdownMenuItem onClick={() => handleViewImages(item)}>
                            <Image className="mr-2 h-4 w-4" />
                            View Images
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12">
          <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || locationFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No items to display'}
          </p>
        </div>
      )}

      {/* Item Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>
              Complete information about the item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              {/* Item Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Product Code</div>
                  <div className="font-mono font-bold">{selectedItem.productCode}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Description</div>
                  <div>{selectedItem.description}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Brand</div>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="brand" value={selectedItem.brandCode} />
                    <span>{selectedItem.brandCode}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Product Division</div>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="division" value={selectedItem.productDivision} />
                    <span>{selectedItem.productDivision}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Product Category</div>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="category" value={selectedItem.productCategory} />
                    <span>{selectedItem.productCategory}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Total Stock</div>
                  <div>{selectedItem.totalStock}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Period</div>
                  <div>{selectedItem.period}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Season</div>
                  <div>{selectedItem.season}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Unit of Measure</div>
                  <UniversalBadge type="unit" value={selectedItem.unitOfMeasure} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <UniversalBadge type="status" value={selectedItem.status} />
                </div>
              </div>

              {/* Stock Information */}
              {selectedItem.stock && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Stock Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Location</div>
                      <UniversalBadge type="location" value={selectedItem.stock.location || ''} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Condition</div>
                      <div className="flex items-center space-x-2">
                        <UniversalBadge type="condition" value={selectedItem.stock.condition} />
                        <span>{selectedItem.stock.condition}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-gray-500">Condition Notes</div>
                      <div>{selectedItem.stock.conditionNotes || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-500 mb-2">Stock Details</div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-blue-50 p-3 rounded text-center">
                        <p className="text-xs text-gray-500">In Storage</p>
                        <p className="font-bold text-blue-600">{selectedItem.stock.inStorage}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded text-center">
                        <p className="text-xs text-gray-500">On Borrow</p>
                        <p className="font-bold text-green-600">{selectedItem.stock.onBorrow}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded text-center">
                        <p className="text-xs text-gray-500">In Clearance</p>
                        <p className="font-bold text-orange-600">{selectedItem.stock.inClearance}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded text-center">
                        <p className="text-xs text-gray-500">Seeded</p>
                        <p className="font-bold text-purple-600">{selectedItem.stock.seeded}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Images Modal */}
      <Dialog open={showImagesModal} onOpenChange={setShowImagesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Images</DialogTitle>
            <DialogDescription>
              Images for {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && selectedItem.images && selectedItem.images.length > 0 && (
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative">
                <img 
                  src={`/uploads/${selectedItem.images[selectedImageIndex].fileName}`}
                  alt={selectedItem.images[selectedImageIndex].altText || 'Item image'}
                  className="w-full h-96 object-contain bg-gray-50 rounded-md"
                />
                {selectedItem.images[selectedImageIndex].isPrimary && (
                  <div className="absolute top-2 left-2">
                    <UniversalBadge type="status" value="primary" />
                  </div>
                )}
              </div>
              
              {/* Thumbnail Navigation */}
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {selectedItem.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2",
                      index === selectedImageIndex ? "border-primary-500" : "border-gray-200"
                    )}
                  >
                    <img 
                      src={`/uploads/${image.fileName}`}
                      alt={image.altText || 'Item image'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              
              {/* Image Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-500">File Name</div>
                  <div>{selectedItem.images[selectedImageIndex].fileName}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">Original Name</div>
                  <div>{selectedItem.images[selectedImageIndex].originalName}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">File Size</div>
                  <div>{(selectedItem.images[selectedImageIndex].size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">MIME Type</div>
                  <div>{selectedItem.images[selectedImageIndex].mimeType}</div>
                </div>
                {selectedItem.images[selectedImageIndex].altText && (
                  <div className="col-span-2">
                    <div className="font-medium text-gray-500">Alt Text</div>
                    <div>{selectedItem.images[selectedImageIndex].altText}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}