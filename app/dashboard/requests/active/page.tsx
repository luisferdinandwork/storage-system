// app/dashboard/requests/active/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  AlertTriangle,
  RefreshCw,
  Clock,
  Eye,
  Package,
  CheckCircle,
  PackageX,
  Box
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import React from 'react';
import { borrowRequests } from '@/lib/db/schema';

// Updated Box interface to match API response
interface Box {
  id: string;
  boxNumber: string;
  description: string | null;
  location: {
    id: string;
    name: string;
  } | null;
}

interface BorrowRequestItem {
  id: string;
  borrowRequestId: string;
  itemId: string;
  quantity: number;
  status: string;
  returnCondition?: string;
  returnNotes?: string;
  completedAt?: string;
  completedBy?: string;
  seededAt?: string;
  seededBy?: string;
  revertedAt?: string;
  revertedBy?: string;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    productCode: string;
    description: string;
    brandCode: string;
    productDivision: string;
    productCategory: string;
    stock?: {
      id: string;
      itemId: string;
      pending: number;
      inStorage: number;
      onBorrow: number;
      inClearance: number;
      seeded: number;
      boxId: string | null;
      condition: string;
      conditionNotes: string | null;
      createdAt: string;
      updatedAt: string;
      box?: {
        id: string;
        boxNumber: string;
        description: string | null;
        location: {
          id: string;
          name: string;
          description: string | null;
        };
      };
    };
    images: Array<{
      id: string;
      itemId: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      altText: string | null;
      isPrimary: boolean;
      createdAt: string;
    }>;
  };
  borrowRequest: {
    id: string;
    userId: string;
    requestedAt: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    managerApprovedBy?: {
      id: string;
      name: string;
    };
    storageApprovedBy?: {
      id: string;
      name: string;
    };
    completedAt?: string;
    completedBy?: string;
    seededAt?: string;
    seededBy?: string;
    revertedAt?: string;
    revertedBy?: string;
    notes?: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      department?: {
        id: string;
        name: string;
      };
    };
  };
}

interface GroupedRequest {
  borrowRequest: BorrowRequestItem['borrowRequest'];
  items: BorrowRequestItem[];
  isOverdue: boolean;
}

export default function ActiveLoansPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [groupedRequests, setGroupedRequests] = useState<GroupedRequest[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showCompleteAllModal, setShowCompleteAllModal] = useState(false);
  const [showSeedAllModal, setShowSeedAllModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<GroupedRequest | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<BorrowRequestItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seedReason, setSeedReason] = useState('');
  const [seedNotes, setSeedNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState<string>('none'); // Changed from empty string to 'none'
  const [completeAllCondition, setCompleteAllCondition] = useState('');
  const [completeAllNotes, setCompleteAllNotes] = useState('');
  const [selectedAllBoxId, setSelectedAllBoxId] = useState<string>('none'); // Changed from empty string to 'none'
  const [seedAllReason, setSeedAllReason] = useState('');
  const [seedAllNotes, setSeedAllNotes] = useState('');

  // Helper functions to calculate days left and determine color
  const calculateDaysLeft = (endDate: string): number => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysLeftColor = (daysLeft: number): string => {
    if (daysLeft < 0) return 'text-gray-600';
    if (daysLeft <= 3) return 'text-red-600 font-semibold';
    if (daysLeft <= 7) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  useEffect(() => {
    fetchRequests();
    fetchBoxes();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/borrow-requests');
      if (response.ok) {
        const data = await response.json();
        // Group items by borrow request
        const grouped: GroupedRequest[] = [];
        
        data.forEach((request: any) => {
          if (request.status === 'active' || request.status === 'overdue') {
            if (request.items && request.items.length > 0) {
              const isOverdue = new Date(request.endDate) < new Date();
              grouped.push({
                borrowRequest: request,
                items: request.items.map((item: any) => ({
                  ...item,
                  borrowRequest: request,
                  item: item.item
                })),
                isOverdue
              });
            }
          }
        });
        
        setGroupedRequests(grouped);
      } else {
        addMessage('error', 'Failed to fetch requests', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      addMessage('error', 'Failed to fetch requests', 'Error');
    } finally {
      setIsLoading(false);
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

  const handleSeed = async () => {
    if (!selectedRequestItem || !seedReason.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequestItem.borrowRequestId}/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: [{
            borrowRequestItemId: selectedRequestItem.id,
            status: 'seeded',
            reason: seedReason,
            notes: seedNotes,
          }]
        }),
      });

      if (response.ok) {
        setShowSeedModal(false);
        setSeedReason('');
        setSeedNotes('');
        setSelectedRequestItem(null);
        fetchRequests();
        addMessage('success', 'Item marked as seeded', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to seed item', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to seed item', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedRequestItem || !returnCondition) return;

    setIsProcessing(true);
    try {
      // Convert 'none' to undefined for the API call
      const boxId = selectedBoxId === 'none' ? undefined : selectedBoxId;
      
      const response = await fetch(`/api/borrow-requests/${selectedRequestItem.borrowRequestId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: [{
            borrowRequestItemId: selectedRequestItem.id,
            status: 'complete',
            returnCondition,
            returnNotes,
            boxId
          }]
        }),
      });

      if (response.ok) {
        setShowCompleteModal(false);
        setReturnCondition('');
        setReturnNotes('');
        setSelectedBoxId('none'); // Reset to 'none' instead of empty string
        setSelectedRequestItem(null);
        fetchRequests();
        addMessage('success', 'Item marked as complete', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to complete item', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to complete item', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedAll = async () => {
    if (!selectedRequest || !seedAllReason.trim()) return;

    setIsProcessing(true);
    try {
      const itemsToSeed = selectedRequest.items.map(item => ({
        borrowRequestItemId: item.id,
        status: 'seeded',
        reason: seedAllReason,
        notes: seedAllNotes,
      }));

      const response = await fetch(`/api/borrow-requests/${selectedRequest.borrowRequest.id}/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: itemsToSeed }),
      });

      if (response.ok) {
        setShowSeedAllModal(false);
        setSeedAllReason('');
        setSeedAllNotes('');
        setSelectedRequest(null);
        fetchRequests();
        addMessage('success', 'All items marked as seeded', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to seed items', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to seed items', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteAll = async () => {
    if (!selectedRequest || !completeAllCondition) return;

    setIsProcessing(true);
    try {
      // Convert 'none' to undefined for the API call
      const boxId = selectedAllBoxId === 'none' ? undefined : selectedAllBoxId;
      
      const itemsToComplete = selectedRequest.items.map(item => ({
        borrowRequestItemId: item.id,
        status: 'complete',
        returnCondition: completeAllCondition,
        returnNotes: completeAllNotes,
        boxId
      }));

      const response = await fetch(`/api/borrow-requests/${selectedRequest.borrowRequest.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: itemsToComplete }),
      });

      if (response.ok) {
        setShowCompleteAllModal(false);
        setCompleteAllCondition('');
        setCompleteAllNotes('');
        setSelectedAllBoxId('none'); // Reset to 'none' instead of empty string
        setSelectedRequest(null);
        fetchRequests();
        addMessage('success', 'All items marked as complete', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to complete items', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to complete items', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredGroupedRequests = groupedRequests.filter(grouped => {
    const matchesSearch = grouped.items.some(item => 
      item.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grouped.borrowRequest.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !grouped.isOverdue) ||
                         (statusFilter === 'overdue' && grouped.isOverdue);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (isOverdue: boolean) => {
    if (isOverdue) {
      return <Badge variant="outline" className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case '00':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Lifestyle</Badge>;
      case '01':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Football</Badge>;
      case '02':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Futsal</Badge>;
      case '03':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800">Street Soccer</Badge>;
      case '04':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Running</Badge>;
      case '05':
        return <Badge variant="outline" className="bg-pink-100 text-pink-800">Training</Badge>;
      case '06':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Volley</Badge>;
      case '08':
        return <Badge variant="outline" className="bg-teal-100 text-teal-800">Badminton</Badge>;
      case '09':
        return <Badge variant="outline" className="bg-cyan-100 text-cyan-800">Tennis</Badge>;
      case '10':
        return <Badge variant="outline" className="bg-lime-100 text-lime-800">Basketball</Badge>;
      case '12':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Skateboard</Badge>;
      case '14':
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Swimming</Badge>;
      case '17':
        return <Badge variant="outline" className="bg-slate-100 text-slate-800">Back to school</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getBrandBadge = (brandCode: string) => {
    switch (brandCode) {
      case 'PIE':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Piero</Badge>;
      case 'SPE':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Specs</Badge>;
      default:
        return <Badge variant="outline">{brandCode}</Badge>;
    }
  };

  // Helper function to get the primary image or first image
  const getPrimaryImage = (images: any[]) => {
    if (!images || images.length === 0) return null;
    return images.find(img => img.isPrimary) || images[0];
  };

  // Helper function to get box display text
  const getBoxDisplayText = (stock: any) => {
    if (!stock.boxId) return null;
    
    if (stock.box) {
      return `${stock.box.location.name} - ${stock.box.boxNumber}`;
    }
    
    return stock.boxId;
  };

  const canSeedItem = session?.user?.role === 'storage-master' || 
                     session?.user?.role === 'storage-master-manager' || 
                     session?.user?.role === 'superadmin';
                     
  const canCompleteItem = session?.user?.role === 'storage-master' || 
                         session?.user?.role === 'storage-master-manager' || 
                         session?.user?.role === 'superadmin';

  return (
    <div className="p-6 space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Lending</h1>
          <p className="text-gray-600">View and manage currently borrowed items</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            {groupedRequests.filter(r => !r.isOverdue).length} Active
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800">
            {groupedRequests.filter(r => r.isOverdue).length} Overdue
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search loans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loans Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Borrowed By</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroupedRequests.map((grouped) => {
              const daysLeft = calculateDaysLeft(grouped.borrowRequest.endDate);
              return (
                <TableRow key={grouped.borrowRequest.id}>
                  <TableCell className="font-medium">{grouped.borrowRequest.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {grouped.items.length} item{grouped.items.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{grouped.borrowRequest.user.name}</div>
                      <div className="text-xs text-gray-400 capitalize">
                        {grouped.borrowRequest.user.role.replace('-', ' ')}
                      </div>
                      {grouped.borrowRequest.user.department && (
                        <div className="text-xs text-gray-400">
                          {grouped.borrowRequest.user.department.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(grouped.borrowRequest.startDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm font-medium ${getDaysLeftColor(daysLeft)}`}>
                      {daysLeft < 0 ? `Ended (${Math.abs(daysLeft)} days ago)` : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                    </div>
                    <div className="text-xs text-gray-500">End: {formatDate(grouped.borrowRequest.endDate, { format: 'short' })}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(grouped.isOverdue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(grouped);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {canCompleteItem && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedRequest(grouped);
                            setShowCompleteAllModal(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete All
                        </Button>
                      )}
                      {canSeedItem && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedRequest(grouped);
                            setShowSeedAllModal(true);
                          }}
                        >
                          <PackageX className="h-4 w-4 mr-1" />
                          Seed All
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Borrowed By</Label>
                  <p className="font-medium">{selectedRequest.borrowRequest.user.name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.borrowRequest.user.email}</p>
                </div>
                <div>
                  <Label>Period</Label>
                  <p className="text-sm">
                    {new Date(selectedRequest.borrowRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.borrowRequest.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label>Days Left</Label>
                  <p className={`text-sm font-medium ${getDaysLeftColor(calculateDaysLeft(selectedRequest.borrowRequest.endDate))}`}>
                    {(() => {
                      const daysLeft = calculateDaysLeft(selectedRequest.borrowRequest.endDate);
                      return daysLeft < 0 ? `Ended (${Math.abs(daysLeft)} days ago)` : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
                    })()}
                  </p>
                </div>
                <div>
                  <Label>Reason</Label>
                  <p className="text-sm">{selectedRequest.borrowRequest.reason}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">Items</Label>
                <div className="mt-2 space-y-3">
                  {selectedRequest.items.map((item) => {
                    const primaryImage = getPrimaryImage(item.item.images);
                    const boxDisplayText = getBoxDisplayText(item.item.stock || {});
                    return (
                      <div key={item.id} className="border rounded-md p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {primaryImage && (
                              <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                <img
                                  src={`/uploads/${primaryImage.fileName}`}
                                  alt={primaryImage.altText || item.item.description}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{item.item.description}</div>
                              <div className="text-sm text-gray-500">{item.item.productCode}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                {getBrandBadge(item.item.brandCode)}
                                {getCategoryBadge(item.item.productCategory)}
                              </div>
                              {boxDisplayText && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Box className="h-3 w-3 mr-1" />
                                  {boxDisplayText}
                                </div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                Qty: {item.quantity}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {canCompleteItem && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedRequestItem(item);
                                  setShowCompleteModal(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            )}
                            {canSeedItem && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequestItem(item);
                                  setShowSeedModal(true);
                                }}
                              >
                                <Package className="h-4 w-4 mr-1" />
                                Seed
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Item Return</DialogTitle>
            <DialogDescription>
              Mark this item as returned and update its condition
            </DialogDescription>
          </DialogHeader>
          {selectedRequestItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRequestItem.item.description}</h4>
                <p className="text-sm text-gray-600">Borrowed by: {selectedRequestItem.borrowRequest.user.name}</p>
                <p className="text-sm text-gray-600">Quantity: {selectedRequestItem.quantity}</p>
              </div>
              <div>
                <Label htmlFor="returnCondition">Return Condition</Label>
                <Select value={returnCondition} onValueChange={setReturnCondition}>
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
              <div>
                <Label htmlFor="boxSelect">Return to Box</Label>
                <Select value={selectedBoxId} onValueChange={setSelectedBoxId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a box" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific box</SelectItem>
                    {boxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.location?.name} - {box.boxNumber} {box.description ? `(${box.description})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="returnNotes">Return Notes</Label>
                <Textarea
                  id="returnNotes"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Any notes about the item condition..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={isProcessing || !returnCondition}
            >
              {isProcessing ? 'Processing...' : 'Complete Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed Modal */}
      <Dialog open={showSeedModal} onOpenChange={setShowSeedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Item as Seeded</DialogTitle>
            <DialogDescription>
              Mark this item as not returned (lost or damaged)
            </DialogDescription>
          </DialogHeader>
          {selectedRequestItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRequestItem.item.description}</h4>
                <p className="text-sm text-gray-600">Borrowed by: {selectedRequestItem.borrowRequest.user.name}</p>
                <p className="text-sm text-gray-600">Quantity: {selectedRequestItem.quantity}</p>
              </div>
              <div>
                <Label htmlFor="seedReason">Reason</Label>
                <Textarea
                  id="seedReason"
                  value={seedReason}
                  onChange={(e) => setSeedReason(e.target.value)}
                  placeholder="Why is this item being marked as seeded?"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="seedNotes">Additional Notes</Label>
                <Textarea
                  id="seedNotes"
                  value={seedNotes}
                  onChange={(e) => setSeedNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeedModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSeed} 
              disabled={isProcessing || !seedReason.trim()}
            >
              {isProcessing ? 'Processing...' : 'Mark as Seeded'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete All Modal */}
      <Dialog open={showCompleteAllModal} onOpenChange={setShowCompleteAllModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete All Items</DialogTitle>
            <DialogDescription>
              Mark all items in this request as returned and update their condition
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRequest.items.length} items</h4>
                <p className="text-sm text-gray-600">Borrowed by: {selectedRequest.borrowRequest.user.name}</p>
              </div>
              <div>
                <Label htmlFor="completeAllCondition">Return Condition</Label>
                <Select value={completeAllCondition} onValueChange={setCompleteAllCondition}>
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
              <div>
                <Label htmlFor="boxSelectAll">Return to Box</Label>
                <Select value={selectedAllBoxId} onValueChange={setSelectedAllBoxId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a box" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific box</SelectItem>
                    {boxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.location?.name} - {box.boxNumber} {box.description ? `(${box.description})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="completeAllNotes">Return Notes</Label>
                <Textarea
                  id="completeAllNotes"
                  value={completeAllNotes}
                  onChange={(e) => setCompleteAllNotes(e.target.value)}
                  placeholder="Any notes about the items condition..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteAllModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteAll} 
              disabled={isProcessing || !completeAllCondition}
            >
              {isProcessing ? 'Processing...' : 'Complete All Returns'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed All Modal */}
      <Dialog open={showSeedAllModal} onOpenChange={setShowSeedAllModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark All Items as Seeded</DialogTitle>
            <DialogDescription>
              Mark all items in this request as not returned (lost or damaged)
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRequest.items.length} items</h4>
                <p className="text-sm text-gray-600">Borrowed by: {selectedRequest.borrowRequest.user.name}</p>
              </div>
              <div>
                <Label htmlFor="seedAllReason">Reason</Label>
                <Textarea
                  id="seedAllReason"
                  value={seedAllReason}
                  onChange={(e) => setSeedAllReason(e.target.value)}
                  placeholder="Why are these items being marked as seeded?"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="seedAllNotes">Additional Notes</Label>
                <Textarea
                  id="seedAllNotes"
                  value={seedAllNotes}
                  onChange={(e) => setSeedAllNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeedAllModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSeedAll} 
              disabled={isProcessing || !seedAllReason.trim()}
            >
              {isProcessing ? 'Processing...' : 'Mark All as Seeded'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}