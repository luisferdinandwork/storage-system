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
import { Checkbox } from '@/components/ui/checkbox';

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
  Image,
  CheckSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalBadge } from '@/components/ui/universal-badge';
import React from 'react';

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
  stock?: {
    id: string;
    itemId: string;
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
    createdAt: string;
    updatedAt: string;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('')
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchItems();
    fetchItemRequests();
    fetchBoxes();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, activeTab]);

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

  const handleApproveItem = async (requestId: string, boxId: string) => {
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
        setShowApproveModal(false);
        setSelectedItem(null);
        setSelectedRequest(null);
        setSelectedBoxId('');
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

  const handleBulkApprove = async (requestIds: string[], boxId: string) => {
    if (requestIds.length === 0) {
      addMessage('warning', 'Please select at least one item to approve', 'Missing Information');
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
        setShowBulkApproveModal(false);
        setSelectedRequestIds([]);
        setSelectAll(false);
        setSelectedBoxId('');
        fetchItems();
        fetchItemRequests();
        addMessage('success', `${requestIds.length} items approved and stored successfully`, 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to approve items', 'Error');
      }
    } catch (error) {
      console.error('Failed to approve items:', error);
      addMessage('error', 'Failed to approve items', 'Error');
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
        setShowBulkRejectModal(false); // Use the correct modal state
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

  const handleOpenBulkApproveModal = () => {
    if (selectedRequestIds.length === 0) {
      addMessage('warning', 'Please select at least one item to approve', 'Missing Information');
      return;
    }
    setShowBulkApproveModal(true);
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
      const pendingRequestIds = pendingRequests.map(req => req.id);
      setSelectedRequestIds(pendingRequestIds);
    } else {
      setSelectedRequestIds([]);
    }
  };

  const filteredRequests = itemRequests.filter(request => {
    const matchesSearch = request.item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         request.item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    // Updated location filter to work with box-based locations
    const matchesLocation = locationFilter === 'all' || 
                           (locationFilter === 'unassigned' && !request.item.stock?.boxId) ||
                           (request.item.stock?.boxId === locationFilter);
    
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const approvedRequests = filteredRequests.filter(r => r.status === 'approved');
  const displayRequests = activeTab === 'pending' ? pendingRequests : 
                         activeTab === 'approved' ? approvedRequests : 
                         filteredRequests;

  // Pagination logic
  const totalPages = Math.ceil(displayRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = displayRequests.slice(indexOfFirstItem, indexOfLastItem);

  // Generate page numbers for pagination controls
  const generatePageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      
      let start = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages - 1, start + maxVisiblePages - 3);
      
      if (end === totalPages - 1) {
        start = Math.max(2, end - maxVisiblePages + 3);
      }
      
      if (start > 2) {
        pageNumbers.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const userRole = session?.user?.role;
  const canManageStorage = userRole === 'storage-master' || userRole === 'storage-master-manager' || userRole === 'superadmin';

  const getStockStatus = (stock?: { inStorage: number; onBorrow: number; inClearance: number; seeded: number }) => {
    if (!stock) return <UniversalBadge type="status" value="no_stock" />;
    
    const totalStock = stock.inStorage + stock.onBorrow + stock.inClearance + stock.seeded;
    
    if (totalStock === 0) {
      return <UniversalBadge type="status" value="out_of_stock" />;
    } else if (stock.inStorage < 5) {
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
          <h1 className="text-3xl font-bold text-gray-900">Warehousing</h1>
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
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="unassigned">Not Assigned</SelectItem>
              {boxes.map(box => (
                <SelectItem key={box.id} value={box.id}>
                  {box.boxNumber} - {box.location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {activeTab === 'pending' && pendingRequests.length > 0 && canManageStorage && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all">Select All ({pendingRequests.length})</Label>
            {selectedRequestIds.length > 0 && (
              <span className="text-sm text-gray-500">
                {selectedRequestIds.length} selected
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleOpenBulkApproveModal}
              disabled={selectedRequestIds.length === 0}
              className="flex items-center space-x-2"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Bulk Approve</span>
            </Button>
            <Button
              onClick={() => {
                if (selectedRequestIds.length === 0) {
                  addMessage('warning', 'Please select at least one item to reject', 'Missing Information');
                  return;
                }
                setShowBulkRejectModal(true); // Use the correct modal state
              }}
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
        <>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === 'pending' && canManageStorage && (
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
                  <TableHead>Stock</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  {/* <TableHead>Status</TableHead> */}
                  <TableHead>Requested By</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRequests.map((request) => (
                  <TableRow key={request.id}>
                    {activeTab === 'pending' && canManageStorage && (
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
                    <TableCell>
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{request.item.totalStock}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.item.stock && (
                        <UniversalBadge type="condition" value={request.item.stock.condition} />
                      )}
                    </TableCell>
                    <TableCell>
                      {request.item.stock?.box ? (
                        <div>
                          <div className="font-medium">{request.item.stock.box.boxNumber}</div>
                          <div className="text-xs text-gray-500">{request.item.stock.box.location.name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not Assigned</span>
                      )}
                    </TableCell>
                    {/* <TableCell>
                      <UniversalBadge type="status" value={request.status} />
                    </TableCell> */}
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
                              Location: {request.item.stock?.box?.boxNumber || 'Not Assigned'}
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

          {/* Pagination Controls */}
          {displayRequests.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, displayRequests.length)} of {displayRequests.length} results
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">Items per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => handleItemsPerPageChange(Number(value))}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {generatePageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-1 text-sm">...</span>
                    ) : (
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(Number(page))}
                        className="h-8 w-8 p-0"
                      >
                        {page}
                      </Button>
                    )}
                  </React.Fragment>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
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
                  <Label>Total Stock</Label>
                  <p>{selectedItem.totalStock}</p>
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
                {selectedItem.stock && (
                  <>
                    <div>
                      <Label>Condition</Label>
                      <div className="flex items-center space-x-2">
                        <UniversalBadge type="condition" value={selectedItem.stock.condition} />
                        <span>{selectedItem.stock.condition}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Location</Label>
                      {selectedItem.stock.box ? (
                        <div>
                          <div className="font-medium">{selectedItem.stock.box.boxNumber}</div>
                          <div className="text-sm text-gray-500">{selectedItem.stock.box.location.name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not Assigned</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label>Condition Notes</Label>
                      <p>{selectedItem.stock.conditionNotes || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <Label>Stock Details</Label>
                      <div className="grid grid-cols-4 gap-2 mt-1">
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-500">In Storage</p>
                          <p className="font-medium">{selectedItem.stock.inStorage}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-500">On Borrow</p>
                          <p className="font-medium">{selectedItem.stock.onBorrow}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-500">In Clearance</p>
                          <p className="font-medium">{selectedItem.stock.inClearance}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Seeded</p>
                          <p className="font-medium">{selectedItem.stock.seeded}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <Label>Status</Label>
                  <UniversalBadge type="status" value={selectedItem.status} />
                </div>
                <div>
                  <Label>Created At</Label>
                  <p>{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
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
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedRequest && handleApproveItem(selectedRequest.id, selectedBoxId)}
              disabled={isProcessing || !selectedBoxId}
            >
              {isProcessing ? 'Processing...' : 'Approve & Store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Modal */}
      <Dialog open={showBulkApproveModal} onOpenChange={setShowBulkApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve & Store Items</DialogTitle>
            <DialogDescription>
              Select a storage box for {selectedRequestIds.length} items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium">Items to Approve</h4>
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
            <Button variant="outline" onClick={() => setShowBulkApproveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleBulkApprove(selectedRequestIds, selectedBoxId)}
              disabled={isProcessing || !selectedBoxId}
            >
              {isProcessing ? 'Processing...' : `Approve ${selectedRequestIds.length} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Modal */}
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