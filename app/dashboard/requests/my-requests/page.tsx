// app/dashboard/requests/my-requests/page.tsx
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
  Plus, 
  Calendar, 
  MapPin, 
  Eye, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BorrowRequest {
  id: string;
  item: {
    id: string;
    productCode: string;
    description: string;
    brandCode: string;
    productDivision: string;
    productCategory: string;
    condition: string;
    location: string | null;
  } | null;
  quantity: number;
  requestedAt: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending_manager' | 'pending_storage' | 'active' | 'returned' | 'rejected' | 'overdue' | 'pending_return' | 'seeded';
  managerApprovedBy?: {
    id: string;
    name: string;
  } | null;
  storageApprovedBy?: {
    id: string;
    name: string;
  } | null;
  dueDate?: string | null;
  returnedAt?: string | null;
  returnCondition?: string | null;
}

export default function MyRequestsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [newRequest, setNewRequest] = useState({
    itemId: '',
    quantity: 1,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [returnForm, setReturnForm] = useState({
    returnCondition: '',
    returnNotes: '',
  });
  const [extendForm, setExtendForm] = useState({
    newEndDate: '',
    reason: '',
  });

  useEffect(() => {
    fetchRequests();
    fetchItems();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/borrow-requests');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched requests:', data); // Debug log
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      addMessage('error', 'Failed to fetch requests. Please try again.', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items?status=available');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch('/api/borrow-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRequest),
      });

      if (response.ok) {
        setShowNewRequestModal(false);
        setNewRequest({
          itemId: '',
          quantity: 1,
          startDate: '',
          endDate: '',
          reason: '',
        });
        fetchRequests();
        addMessage('success', 'Request submitted successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to submit request', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to submit request', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnForm),
      });

      if (response.ok) {
        setShowReturnModal(false);
        setReturnForm({ returnCondition: '', returnNotes: '' });
        setSelectedRequest(null);
        fetchRequests();
        addMessage('success', 'Return request submitted', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to submit return request', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to submit return request', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extendForm),
      });

      if (response.ok) {
        setShowExtendModal(false);
        setExtendForm({ newEndDate: '', reason: '' });
        setSelectedRequest(null);
        fetchRequests();
        addMessage('success', 'Extension request submitted', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to submit extension request', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to submit extension request', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (!request.item) return false;
    
    const matchesSearch = request.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_manager':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Manager</Badge>;
      case 'pending_storage':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Pending Storage</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case 'returned':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Returned</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Overdue</Badge>;
      case 'pending_return':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Return Pending</Badge>;
      case 'seeded':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Seeded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'good':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Good</Badge>;
      case 'fair':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Fair</Badge>;
      case 'poor':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Poor</Badge>;
      default:
        return <Badge variant="outline">{condition}</Badge>;
    }
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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Borrow Requests</h1>
          <p className="text-gray-600">View and manage your item borrow requests</p>
        </div>
        <Button onClick={() => setShowNewRequestModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search requests..."
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
            <SelectItem value="pending_manager">Pending Manager</SelectItem>
            <SelectItem value="pending_storage">Pending Storage</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="pending_return">Return Pending</SelectItem>
            <SelectItem value="seeded">Seeded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {request.item ? (
                      <div className="flex flex-col">
                        <div className="font-medium">{request.item.description}</div>
                        <div className="text-sm text-gray-500">{request.item.productCode}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          {getBrandBadge(request.item.brandCode)}
                          {getCategoryBadge(request.item.productCategory)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Item not found</div>
                    )}
                  </TableCell>
                  <TableCell>{request.quantity}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(request.startDate).toLocaleDateString()}</div>
                      <div className="text-gray-500">to {new Date(request.endDate).toLocaleDateString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {request.dueDate && (
                      <div className="text-sm">
                        {new Date(request.dueDate) < new Date() ? (
                          <span className="text-red-600 font-medium">
                            {new Date(request.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>{new Date(request.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {request.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowReturnModal(true);
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Return
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowExtendModal(true);
                            }}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Extend
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Request Modal */}
      <Dialog open={showNewRequestModal} onOpenChange={setShowNewRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Borrow Request</DialogTitle>
            <DialogDescription>
              Request to borrow an item from the inventory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <Label htmlFor="itemId">Item</Label>
              <Select value={newRequest.itemId} onValueChange={(value) => setNewRequest(prev => ({ ...prev, itemId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description} ({item.productCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newRequest.quantity}
                onChange={(e) => setNewRequest(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={newRequest.startDate}
                onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={newRequest.endDate}
                onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={newRequest.reason}
                onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Why do you need this item?"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewRequestModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Request Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Return</DialogTitle>
            <DialogDescription>
              Request to return the borrowed item
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturnRequest} className="space-y-4">
            <div>
              <Label htmlFor="returnCondition">Return Condition</Label>
              <Select value={returnForm.returnCondition} onValueChange={(value) => setReturnForm(prev => ({ ...prev, returnCondition: value }))}>
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
              <Label htmlFor="returnNotes">Return Notes</Label>
              <Textarea
                id="returnNotes"
                value={returnForm.returnNotes}
                onChange={(e) => setReturnForm(prev => ({ ...prev, returnNotes: e.target.value }))}
                placeholder="Any notes about the item condition"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReturnModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Submitting...' : 'Request Return'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Extend Request Modal */}
      <Dialog open={showExtendModal} onOpenChange={setShowExtendModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Extension</DialogTitle>
            <DialogDescription>
              Request to extend the borrow period
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExtendRequest} className="space-y-4">
            <div>
              <Label htmlFor="newEndDate">New End Date</Label>
              <Input
                id="newEndDate"
                type="date"
                value={extendForm.newEndDate}
                onChange={(e) => setExtendForm(prev => ({ ...prev, newEndDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="extendReason">Reason</Label>
              <Textarea
                id="extendReason"
                value={extendForm.reason}
                onChange={(e) => setExtendForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Why do you need to extend the borrow period?"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExtendModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Submitting...' : 'Request Extension'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}