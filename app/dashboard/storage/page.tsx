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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageContainer } from '@/components/ui/message';

import { useMessages } from '@/hooks/use-messages';
import { 
  Package, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock,
  Warehouse,
  ArrowRight,
  Image
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
  inventory: number;
  period: string;
  season: string;
  unitOfMeasure: string;
  location: string | null;
  condition: string;
  conditionNotes: string | null;
  status: 'pending_approval' | 'approved' | 'available' | 'borrowed' | 'in_clearance' | 'rejected';
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
}

interface ItemRequest {
  id: string;
  itemId: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  item: Item;
  requestedByUser: {
    id: string;
    name: string;
    role: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
  };
}

export default function StorageManagementPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('Storage 1');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    fetchItems();
    fetchItemRequests();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
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

  const fetchItemRequests = async () => {
    try {
      const response = await fetch('/api/item-requests');
      if (response.ok) {
        const data = await response.json();
        setItemRequests(data);
      } else {
        addMessage('error', 'Failed to fetch item requests', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch item requests:', error);
    }
  };

  const handleApproveItem = async (requestId: string, location: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/item-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (response.ok) {
        setShowApproveModal(false);
        setSelectedItem(null);
        setSelectedRequest(null);
        setSelectedLocation('Storage 1');
        fetchItems();
        fetchItemRequests();
        addMessage('success', 'Item approved and stored successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to approve item', 'Error');
      }
    } catch (error) {
      console.error('Failed to approve item:', error);
      addMessage('error', 'Failed to approve item', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectItem = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      addMessage('warning', 'Please provide a reason for rejection', 'Missing Information');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/item-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        setShowRejectModal(false);
        setRejectionReason('');
        fetchItems();
        fetchItemRequests();
        addMessage('success', 'Item rejected successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to reject item', 'Error');
      }
    } catch (error) {
      console.error('Failed to reject item:', error);
      addMessage('error', 'Failed to reject item', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleOpenApproveModal = (request: ItemRequest) => {
    setSelectedRequest(request);
    setSelectedItem(request.item);
    setShowApproveModal(true);
  };

  const handleOpenRejectModal = (request: ItemRequest) => {
    setSelectedRequest(request);
    setSelectedItem(request.item);
    setShowRejectModal(true);
  };

  const filteredRequests = itemRequests.filter(request => {
    const matchesSearch = request.item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         request.item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || request.item.location === locationFilter;
    
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const approvedRequests = filteredRequests.filter(r => r.status === 'approved');
  const displayRequests = activeTab === 'pending' ? pendingRequests : 
                         activeTab === 'approved' ? approvedRequests : 
                         filteredRequests;

  const userRole = session?.user?.role;
  const canManageStorage = userRole === 'storage-master' || userRole === 'storage-master-manager' || userRole === 'superadmin';

  const getStockStatus = (inventory: number) => {
    if (inventory === 0) {
      return <UniversalBadge type="status" value="out_of_stock" />;
    } else if (inventory < 5) {
      return <UniversalBadge type="status" value="low_stock" />;
    } else {
      return <UniversalBadge type="status" value="in_stock" />;
    }
  };

  const getPrimaryImage = (images: any[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storage Management</h1>
          <p className="text-gray-600 mt-1">Manage item locations and approve new items</p>
        </div>
        <div className="flex items-center space-x-2">
          <UniversalBadge type="status" value="pending" />
          <span className="text-sm">{pendingRequests.length}</span>
          <UniversalBadge type="status" value="approved" />
          <span className="text-sm">{approvedRequests.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'pending'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Pending Approval ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'approved'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Approved ({approvedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            All Items
          </button>
        </nav>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
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
                <TableHead>Product Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {request.item.images && request.item.images.length > 0 && (
                          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={getPrimaryImage(request.item.images).fileName ? `/uploads/${getPrimaryImage(request.item.images).fileName}` : '/placeholder.jpg'} 
                              alt={getPrimaryImage(request.item.images).altText || request.item.description}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      <div className="flex flex-col min-w-0">
                        <div className="font-medium truncate">{request.item.description}</div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <UniversalBadge type="brand" value={request.item.brandCode} />
                          <span>/</span>
                            <UniversalBadge type="division" value={request.item.productDivision} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{request.item.productCode}</TableCell>
                  <TableCell>
                    <UniversalBadge type="category" value={request.item.productCategory} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <span className="font-medium">{request.item.inventory}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <UniversalBadge type="condition" value={request.item.condition} />
                  </TableCell>
                  <TableCell>
                    <UniversalBadge type="location" value={request.item.location || ''} />
                  </TableCell>
                  <TableCell>
                    <UniversalBadge type="status" value={request.status} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{request.requestedByUser?.name || 'Unknown'}</div>
                      <div className="text-gray-500 capitalize">{request.requestedByUser?.role?.replace('-', ' ') || 'Unknown'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(request.requestedAt).toLocaleDateString()}
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
                        <DropdownMenuItem onClick={() => handleViewDetails(request.item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        {request.item.images && request.item.images.length > 0 && (
                          <DropdownMenuItem>
                            <Image className="mr-2 h-4 w-4" />
                            View Images
                          </DropdownMenuItem>
                        )}
                        
                        {request.status === 'pending' && canManageStorage && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleOpenApproveModal(request)}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve & Store
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenRejectModal(request)}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {request.status === 'approved' && (
                          <DropdownMenuItem className="text-gray-600">
                            <MapPin className="mr-2 h-4 w-4" />
                            Location: {request.item.location || 'Not Assigned'}
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

      {!isLoading && displayRequests.length === 0 && (
        <div className="text-center py-12">
          <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || locationFilter !== 'all' 
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
              {/* Images */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedItem.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={`/uploads/${image.fileName}`}
                          alt={image.altText || 'Item image'}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        {image.isPrimary && (
                          <UniversalBadge type="status" value="primary" className="absolute top-2 left-2 text-xs" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Item Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Code</Label>
                  <p className="font-mono">{selectedItem.productCode}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p>{selectedItem.description}</p>
                </div>
                <div>
                  <Label>Brand</Label>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="brand" value={selectedItem.brandCode} />
                    <span>{selectedItem.brandCode}</span>
                  </div>
                </div>
                <div>
                  <Label>Product Division</Label>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="division" value={selectedItem.productDivision} />
                    <span>{selectedItem.productDivision}</span>
                  </div>
                </div>
                <div>
                  <Label>Product Category</Label>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="category" value={selectedItem.productCategory} />
                    <span>{selectedItem.productCategory}</span>
                  </div>
                </div>
                <div>
                  <Label>Inventory</Label>
                  <p>{selectedItem.inventory}</p>
                </div>
                <div>
                  <Label>Period</Label>
                  <p>{selectedItem.period}</p>
                </div>
                <div>
                  <Label>Season</Label>
                  <p>{selectedItem.season}</p>
                </div>
                <div>
                  <Label>Unit of Measure</Label>
                  <UniversalBadge type="unit" value={selectedItem.unitOfMeasure} />
                </div>
                <div>
                  <Label>Condition</Label>
                  <div className="flex items-center space-x-2">
                    <UniversalBadge type="condition" value={selectedItem.condition} />
                    <span>{selectedItem.condition}</span>
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <UniversalBadge type="location" value={selectedItem.location || ''} />
                </div>
                <div>
                  <Label>Status</Label>
                  <UniversalBadge type="status" value={selectedItem.status} />
                </div>
                <div className="col-span-2">
                  <Label>Condition Notes</Label>
                  <p>{selectedItem.conditionNotes || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Store Item</DialogTitle>
            <DialogDescription>
              Select a storage location for this item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedItem.description}</h4>
                <p className="text-sm text-gray-600">Product Code: {selectedItem.productCode}</p>
                <p className="text-sm text-gray-600">Inventory: {selectedItem.inventory} units</p>
              </div>
              
              <div>
                <Label htmlFor="location">Storage Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Storage 1">Storage 1</SelectItem>
                    <SelectItem value="Storage 2">Storage 2</SelectItem>
                    <SelectItem value="Storage 3">Storage 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedRequest && handleApproveItem(selectedRequest.id, selectedLocation)}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Approve & Store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Item</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedItem.description}</h4>
                <p className="text-sm text-gray-600">Product Code: {selectedItem.productCode}</p>
              </div>
              
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedRequest && handleRejectItem(selectedRequest.id, rejectionReason)}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? 'Processing...' : 'Reject Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}