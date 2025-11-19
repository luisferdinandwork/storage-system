'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  MapPin,
  Plus,
  Building,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalBadge } from '@/components/ui/universal-badge';
import { ItemDetailsModal } from '@/components/storage/ItemDetailsModal';

interface Box {
  id: string;
  boxNumber: string;
  description: string;
  location: {
    id: string;
    name: string;
  };
}

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
  createdBy: string; 
  createdAt: string; 
  updatedAt: string; 
  approvedBy: string | null; 
  approvedAt: string | null; 
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
  stock?: {
    id: string;
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    boxId: string | null;
    box?: {
      id: string;
      boxNumber: string;
      description: string;
      location: {
        id: string;
        name: string;
      };
    };
    condition: string;
    conditionNotes: string | null;
  };
  stockRecords?: Array<{
    id: string;
    itemId: string;
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    boxId: string | null;
    box?: Box;
    location?: {
      id: string;
      name: string;
    };
    condition: string;
    conditionNotes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function StockLocationsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [boxFilter, setBoxFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isBoxLoading, setIsBoxLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // New box form state
  const [newBox, setNewBox] = useState({
    boxNumber: '',
    description: '',
    locationId: ''
  });
  const [isAddingBox, setIsAddingBox] = useState(false);

  useEffect(() => {
    fetchStockItems();
    fetchBoxes();
  }, [searchTerm, boxFilter, locationFilter]);

  const fetchStockItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (boxFilter !== 'all') params.append('boxId', boxFilter);
      if (locationFilter !== 'all') params.append('locationId', locationFilter);
      
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

  const fetchBoxes = async () => {
    setIsBoxLoading(true);
    try {
      const response = await fetch('/api/boxes');
      if (response.ok) {
        const data = await response.json() as Box[]; 
        
        setBoxes(data);
        
        const uniqueLocations = Array.from(
          new Map(data.map((box: Box) => [box.location.id, box.location])).values()
        ) as { id: string; name: string }[]; 
        
        setLocations(uniqueLocations);
      } else {
        addMessage('error', 'Failed to fetch boxes', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
      addMessage('error', 'Failed to fetch boxes', 'Error');
    } finally {
      setIsBoxLoading(false);
    }
  };

  const handleAddBox = async () => {
    if (!newBox.boxNumber.trim() || !newBox.locationId) {
      addMessage('warning', 'Box number and location are required', 'Missing Information');
      return;
    }

    setIsAddingBox(true);
    try {
      const response = await fetch('/api/boxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBox),
      });

      if (response.ok) {
        setShowAddBoxModal(false);
        setNewBox({
          boxNumber: '',
          description: '',
          locationId: ''
        });
        fetchBoxes();
        addMessage('success', 'Box added successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to add box', 'Error');
      }
    } catch (error) {
      console.error('Failed to add box:', error);
      addMessage('error', 'Failed to add box', 'Error');
    } finally {
      setIsAddingBox(false);
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
  const totalPending = items.reduce((sum, item) => {
    // If item has stockRecords, sum pending from all records
    if (item.stockRecords && item.stockRecords.length > 0) {
      return sum + item.stockRecords.reduce((recordSum, record) => recordSum + record.pending, 0);
    }
    // Otherwise use the stock object
    return sum + (item.stock?.pending || 0);
  }, 0);
  
  const totalInStorage = items.reduce((sum, item) => {
    if (item.stockRecords && item.stockRecords.length > 0) {
      return sum + item.stockRecords.reduce((recordSum, record) => recordSum + record.inStorage, 0);
    }
    return sum + (item.stock?.inStorage || 0);
  }, 0);
  
  const totalOnBorrow = items.reduce((sum, item) => {
    if (item.stockRecords && item.stockRecords.length > 0) {
      return sum + item.stockRecords.reduce((recordSum, record) => recordSum + record.onBorrow, 0);
    }
    return sum + (item.stock?.onBorrow || 0);
  }, 0);
  
  const totalInClearance = items.reduce((sum, item) => {
    if (item.stockRecords && item.stockRecords.length > 0) {
      return sum + item.stockRecords.reduce((recordSum, record) => recordSum + record.inClearance, 0);
    }
    return sum + (item.stock?.inClearance || 0);
  }, 0);
  
  const totalSeeded = items.reduce((sum, item) => {
    if (item.stockRecords && item.stockRecords.length > 0) {
      return sum + item.stockRecords.reduce((recordSum, record) => recordSum + record.seeded, 0);
    }
    return sum + (item.stock?.seeded || 0);
  }, 0);
  
  const grandTotal = totalPending + totalInStorage + totalOnBorrow + totalInClearance + totalSeeded;

  const userRole = session?.user?.role;
  const canManageBoxes = userRole === 'superadmin' || userRole === 'storage-master' || userRole === 'storage-master-manager';

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Locations</h1>
          <p className="text-gray-600 mt-1">View and manage item stock across all locations</p>
        </div>
        {canManageBoxes && (
          <Button onClick={() => setShowAddBoxModal(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Box</span>
          </Button>
        )}
      </div>

      {/* Stock Summary Cards with Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Clock className="mr-2 h-5 w-5 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Items pending approval</p>
          </CardContent>
        </Card>
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
        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Package className="mr-2 h-5 w-5 text-gray-500" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{grandTotal}</div>
            <p className="text-xs text-muted-foreground">Total items in inventory</p>
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
          <Select value={boxFilter} onValueChange={setBoxFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Boxes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boxes</SelectItem>
              <SelectItem value="unassigned">Not Assigned</SelectItem>
              {boxes.map(box => (
                <SelectItem key={box.id} value={box.id}>
                  {box.boxNumber} - {box.location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead>Pending</TableHead>
                <TableHead>In Storage</TableHead>
                <TableHead>On Borrow</TableHead>
                <TableHead>In Clearance</TableHead>
                <TableHead>Seeded</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Boxes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                // Calculate item totals
                const itemPending = item.stockRecords 
                  ? item.stockRecords.reduce((sum, record) => sum + record.pending, 0)
                  : (item.stock?.pending || 0);
                const itemInStorage = item.stockRecords 
                  ? item.stockRecords.reduce((sum, record) => sum + record.inStorage, 0)
                  : (item.stock?.inStorage || 0);
                const itemOnBorrow = item.stockRecords 
                  ? item.stockRecords.reduce((sum, record) => sum + record.onBorrow, 0)
                  : (item.stock?.onBorrow || 0);
                const itemInClearance = item.stockRecords 
                  ? item.stockRecords.reduce((sum, record) => sum + record.inClearance, 0)
                  : (item.stock?.inClearance || 0);
                const itemSeeded = item.stockRecords 
                  ? item.stockRecords.reduce((sum, record) => sum + record.seeded, 0)
                  : (item.stock?.seeded || 0);
                const itemTotal = itemPending + itemInStorage + itemOnBorrow + itemInClearance + itemSeeded;
                
                return (
                  <TableRow key={item.productCode}>
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
                      <span className="font-medium text-yellow-600">{itemPending}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">{itemInStorage}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">{itemOnBorrow}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-orange-600">{itemInClearance}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-purple-600">{itemSeeded}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-700">{itemTotal}</span>
                    </TableCell>
                    <TableCell>
                      {item.stockRecords && item.stockRecords.length > 0 ? (
                        <div className="text-sm">
                          {item.stockRecords
                            .map((record) => record.box?.boxNumber || 'Unknown Box')
                            .join(', ')}
                        </div>
                      ) : (
                        <span className="text-gray-500">Not Assigned</span>
                      )}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12">
          <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || boxFilter !== 'all' || locationFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No items to display'}
          </p>
        </div>
      )}

      {/* Item Details Modal Component */}
      <ItemDetailsModal 
        open={showDetailsModal} 
        onOpenChange={setShowDetailsModal} 
        item={selectedItem} 
      />

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

      {/* Add Box Modal */}
      <Dialog open={showAddBoxModal} onOpenChange={setShowAddBoxModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Box</DialogTitle>
            <DialogDescription>
              Create a new storage box in a specific location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="boxNumber">Box Number</Label>
              <Input
                id="boxNumber"
                value={newBox.boxNumber}
                onChange={(e) => setNewBox({...newBox, boxNumber: e.target.value})}
                placeholder="Enter box number"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newBox.description}
                onChange={(e) => setNewBox({...newBox, description: e.target.value})}
                placeholder="Enter box description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={newBox.locationId} onValueChange={(value) => setNewBox({...newBox, locationId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBoxModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddBox}
              disabled={isAddingBox || !newBox.boxNumber.trim() || !newBox.locationId}
            >
              {isAddingBox ? 'Adding...' : 'Add Box'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}