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
import { MessageContainer } from '@/components/ui/message';
import { UniversalBadge } from '@/components/ui/universal-badge';
import { ItemDetailsModal } from '@/components/storage/ItemDetailsModal';
import { Checkbox } from '@/components/ui/checkbox';

import { useMessages } from '@/hooks/use-messages';
import { 
  Package, 
  Search, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle,
  Image,
  CheckSquare
} from 'lucide-react';

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
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBulkReceiveModal, setShowBulkReceiveModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchItemRequests();
    fetchBoxes();
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
      const response = await fetch('/api/item-requests?status=pending');
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

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes');
      if (response.ok) {
        const data = await response.json();
        setBoxes(data);
      } else {
        addMessage('error', 'Failed to fetch boxes', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
      addMessage('error', 'Failed to fetch boxes', 'Error');
    }
  };

  const handleReceiveItem = async (requestId: string, boxId: string) => {
    if (!boxId) {
      addMessage('warning', 'Please select a storage box', 'Missing Information');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/item-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boxId }),
      });

      if (response.ok) {
        setShowReceiveModal(false);
        setSelectedItem(null);
        setSelectedRequest(null);
        setSelectedBoxId('');
        fetchItems();
        fetchItemRequests();
        addMessage('success', 'Item received and stored successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to receive item', 'Error');
      }
    } catch (error) {
      console.error('Failed to receive item:', error);
      addMessage('error', 'Failed to receive item', 'Error');
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

  const handleBulkReceive = async (requestIds: string[], boxId: string) => {
    if (requestIds.length === 0) {
      addMessage('warning', 'Please select at least one item to receive', 'Missing Information');
      return;
    }

    if (!boxId) {
      addMessage('warning', 'Please select a storage box', 'Missing Information');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/item-requests/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestIds, boxId }),
      });

      if (response.ok) {
        setShowBulkReceiveModal(false);
        setSelectedRequestIds([]);
        setSelectAll(false);
        setSelectedBoxId('');
        fetchItems();
        fetchItemRequests();
        addMessage('success', `${requestIds.length} items received and stored successfully`, 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to receive items', 'Error');
      }
    } catch (error) {
      console.error('Failed to receive items:', error);
      addMessage('error', 'Failed to receive items', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async (requestIds: string[], reason: string) => {
    if (requestIds.length === 0) {
      addMessage('warning', 'Please select at least one item to reject', 'Missing Information');
      return;
    }

    if (!reason.trim()) {
      addMessage('warning', 'Please provide a reason for rejection', 'Missing Information');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/item-requests/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestIds, reason }),
      });

      if (response.ok) {
        setShowBulkRejectModal(false);
        setSelectedRequestIds([]);
        setSelectAll(false);
        setBulkRejectionReason('');
        fetchItems();
        fetchItemRequests();
        addMessage('success', `${requestIds.length} items rejected successfully`, 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to reject items', 'Error');
      }
    } catch (error) {
      console.error('Failed to reject items:', error);
      addMessage('error', 'Failed to reject items', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleOpenReceiveModal = (request: ItemRequest) => {
    setSelectedRequest(request);
    setSelectedItem(request.item);
    setShowReceiveModal(true);
  };

  const handleOpenRejectModal = (request: ItemRequest) => {
    setSelectedRequest(request);
    setSelectedItem(request.item);
    setShowRejectModal(true);
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequestIds(prev => [...prev, requestId]);
    } else {
      setSelectedRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const pendingRequestIds = itemRequests.map(req => req.id);
      setSelectedRequestIds(pendingRequestIds);
    } else {
      setSelectedRequestIds([]);
    }
  };

  const filteredRequests = itemRequests.filter(request => {
    const matchesSearch = request.item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         request.item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeason = seasonFilter === 'all' || request.item.season === seasonFilter;
    const matchesBrand = brandFilter === 'all' || request.item.brandCode === brandFilter;
    const matchesDivision = divisionFilter === 'all' || request.item.productDivision === divisionFilter;
    const matchesCategory = categoryFilter === 'all' || request.item.productCategory === categoryFilter;
    const matchesPeriod = periodFilter === 'all' || request.item.period === periodFilter;
    
    return matchesSearch && matchesSeason && matchesBrand && matchesDivision && matchesCategory && matchesPeriod;
  });

  const userRole = session?.user?.role;
  const canManageStorage = userRole === 'storage-master' || userRole === 'storage-master-manager' || userRole === 'superadmin';

  const getPrimaryImage = (images: any[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  // Get unique values for filters
  const seasons = [...new Set(itemRequests.map(req => req.item.season))];
  const brands = [...new Set(itemRequests.map(req => req.item.brandCode))];
  const divisions = [...new Set(itemRequests.map(req => req.item.productDivision))];
  const categories = [...new Set(itemRequests.map(req => req.item.productCategory))];
  const periods = [...new Set(itemRequests.map(req => req.item.period))];

  return (
    <div className="space-y-4">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Item Approvals</h1>
          <p className="text-gray-600 mt-1">Review and receive new items for storage</p>
        </div>
        <div className="flex items-center space-x-2">
          <UniversalBadge type="status" value="pending" />
          <span className="text-sm">{filteredRequests.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(season => (
              <SelectItem key={season} value={season}>{season}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(brand => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(division => (
              <SelectItem key={division} value={division}>{division}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {periods.map(period => (
              <SelectItem key={period} value={period}>{period}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {filteredRequests.length > 0 && canManageStorage && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all">Select All ({filteredRequests.length})</Label>
            {selectedRequestIds.length > 0 && (
              <span className="text-sm text-gray-500">
                {selectedRequestIds.length} selected
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowBulkReceiveModal(true)}
              disabled={selectedRequestIds.length === 0}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Bulk Receive</span>
            </Button>
            <Button
              onClick={() => setShowBulkRejectModal(true)}
              disabled={selectedRequestIds.length === 0}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <XCircle className="h-4 w-4" />
              <span>Bulk Reject</span>
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canManageStorage && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead>Item</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  {canManageStorage && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRequestIds.includes(request.id)}
                        onCheckedChange={(checked) => handleSelectRequest(request.id, checked as boolean)}
                        aria-label={`Select ${request.item.description}`}
                      />
                    </TableCell>
                  )}
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
                        <div className="text-sm font-medium">{request.item.productCode}</div>
                        <div className="font-normal truncate">{request.item.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="brand" value={request.item.brandCode} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="division" value={request.item.productDivision} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="category" value={request.item.productCategory} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="season" value={request.item.season} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="period" value={request.item.period} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center">
                      <span className="font-medium">{request.item.totalStock}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{request.requestedByUser?.name || 'Unknown'}</div>
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
                        
                        {canManageStorage && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleOpenReceiveModal(request)}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Receive & Store
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || seasonFilter !== 'all' || brandFilter !== 'all' || divisionFilter !== 'all' || categoryFilter !== 'all' || periodFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'All items have been processed'}
          </p>
        </div>
      )}

      <ItemDetailsModal 
        open={showDetailsModal} 
        onOpenChange={setShowDetailsModal} 
        item={selectedItem} 
      />

      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive & Store Item</DialogTitle>
            <DialogDescription>
              Select a storage box for this item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedItem.description}</h4>
                <p className="text-sm text-gray-600">Product Code: {selectedItem.productCode}</p>
                <p className="text-sm text-gray-600">Total Stock: {selectedItem.totalStock} units</p>
              </div>
              
              <div>
                <Label htmlFor="box">Storage Box</Label>
                <Select value={selectedBoxId} onValueChange={setSelectedBoxId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage box" />
                  </SelectTrigger>
                  <SelectContent>
                    {boxes.map(box => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.boxNumber} - {box.location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedRequest && handleReceiveItem(selectedRequest.id, selectedBoxId)}
              disabled={isProcessing || !selectedBoxId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Receive & Store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkReceiveModal} onOpenChange={setShowBulkReceiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Receive Items</DialogTitle>
            <DialogDescription>
              Select a storage box for {selectedRequestIds.length} items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium">Items to Receive</h4>
              <p className="text-sm text-gray-600">{selectedRequestIds.length} items selected</p>
            </div>
            
            <div>
              <Label htmlFor="bulk-box">Storage Box</Label>
              <Select value={selectedBoxId} onValueChange={setSelectedBoxId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select storage box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes.map(box => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.boxNumber} - {box.location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReceiveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleBulkReceive(selectedRequestIds, selectedBoxId)}
              disabled={isProcessing || !selectedBoxId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : `Receive ${selectedRequestIds.length} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkRejectModal} onOpenChange={setShowBulkRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Items</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedRequestIds.length} items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium">Items to Reject</h4>
              <p className="text-sm text-gray-600">{selectedRequestIds.length} items selected</p>
            </div>
            
            <div>
              <Label htmlFor="bulk-rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="bulk-rejection-reason"
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRejectModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleBulkReject(selectedRequestIds, bulkRejectionReason)}
              disabled={isProcessing || !bulkRejectionReason.trim()}
            >
              {isProcessing ? 'Processing...' : `Reject ${selectedRequestIds.length} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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