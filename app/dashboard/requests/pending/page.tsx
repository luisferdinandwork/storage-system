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
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BorrowRequest {
  id: string;
  items: Array<{
    id: string;
    item: {
      id: string;
      productCode: string;
      description: string;
      images: Array<{
        id: string;
        fileName: string;
        altText: string | null;
        isPrimary: boolean;
      }>;
    };
    quantity: number;
    status: string;
  }>;
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
  requestedAt: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending_manager' | 'pending_storage' | 'pending_extension';
  managerApprovedBy?: {
    id: string;
    name: string;
  };
  storageApprovedBy?: {
    id: string;
    name: string;
  };
}

export default function PendingApprovalsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalType, setApprovalType] = useState<'manager' | 'storage'>('manager');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/borrow-requests');
      if (response.ok) {
        const data = await response.json();
        // Filter for pending requests based on user role
        const filteredData = data.filter((req: BorrowRequest) => {
          if (session?.user?.role === 'manager') {
            return req.status === 'pending_manager';
          } else if (session?.user?.role === 'storage-master' || session?.user?.role === 'storage-master-manager') {
            return req.status === 'pending_storage' || req.status === 'pending_extension';
          } else if (session?.user?.role === 'superadmin') {
            return req.status === 'pending_manager' || req.status === 'pending_storage' || req.status === 'pending_extension';
          }
          return false;
        });
        setRequests(filteredData);
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

  const handleApprove = async (request: BorrowRequest, type: 'manager' | 'storage') => {
    setSelectedRequest(request);
    setApprovalType(type);
    setShowApproveModal(true);
  };

  const handleReject = async (request: BorrowRequest, type: 'manager' | 'storage') => {
    setSelectedRequest(request);
    setApprovalType(type);
    setShowRejectModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approvalType }),
      });

      if (response.ok) {
        setShowApproveModal(false);
        setSelectedRequest(null);
        fetchRequests();
        addMessage('success', 'Request approved successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to approve request', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to approve request', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reason: rejectionReason.trim(),
          rejectionType: approvalType 
        }),
      });

      if (response.ok) {
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedRequest(null);
        fetchRequests();
        addMessage('success', 'Request rejected successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to reject request', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to reject request', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.items.some(reqItem => 
      reqItem.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reqItem.item.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    ) || request.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_manager':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Manager</Badge>;
      case 'pending_storage':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Pending Storage</Badge>;
      case 'pending_extension':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Extension Request</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPrimaryImage = (images: any[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  const getApprovalActions = (request: BorrowRequest) => {
    const userRole = session?.user?.role;
    if (!userRole) return null;
    
    const actions = [];
    
    if (userRole === 'superadmin') {
      if (request.status === 'pending_manager') {
        actions.push({ type: 'manager' as const, label: 'Approve (M)' });
      }
      if (request.status === 'pending_storage') {
        actions.push({ type: 'storage' as const, label: 'Approve (S)' });
      }
    } else if (userRole === 'manager' && request.status === 'pending_manager') {
      actions.push({ type: 'manager' as const, label: 'Approve' });
    } else if (['storage-master', 'storage-master-manager'].includes(userRole) && request.status === 'pending_storage') {
      actions.push({ type: 'storage' as const, label: 'Approve' });
    }
    
    return actions.length > 0 ? actions : null;
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
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve borrow requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending_manager">Pending Manager</option>
          <option value="pending_storage">Pending Storage</option>
          <option value="pending_extension">Extension Request</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Items</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No pending requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="space-y-2">
                      {request.items.map((reqItem) => (
                        <div key={reqItem.id} className="flex items-center space-x-3">
                          {reqItem.item.images && reqItem.item.images.length > 0 && (
                            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={getPrimaryImage(reqItem.item.images).fileName ? `/uploads/${getPrimaryImage(reqItem.item.images).fileName}` : '/placeholder.jpg'}
                                alt={getPrimaryImage(reqItem.item.images).altText || reqItem.item.description}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm">{reqItem.item.productCode}</div>
                            <div className="text-sm text-gray-600 truncate">{reqItem.item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.items.map((reqItem) => (
                      <div key={reqItem.id} className="text-sm">{reqItem.quantity}</div>
                    ))}
                  </TableCell>
                  <TableCell className="text-sm">{request.user.name}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm" title={request.reason}>
                      {request.reason}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{new Date(request.startDate).toLocaleDateString()}</div>
                    <div className="text-gray-500">to {new Date(request.endDate).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {getApprovalActions(request)?.map((action) => (
                        <div key={action.type} className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request, action.type)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request, action.type)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Requested By:</span> {selectedRequest.user.name}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <span className="font-medium">Period:</span> {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Requested At:</span> {new Date(selectedRequest.requestedAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="font-medium">Reason:</span>
                <p className="text-sm text-gray-600 mt-1">{selectedRequest.reason}</p>
              </div>
              <div>
                <span className="font-medium">Items:</span>
                <div className="mt-2 space-y-2">
                  {selectedRequest.items.map((reqItem) => (
                    <div key={reqItem.id} className="flex items-center space-x-3 p-2 border rounded">
                      {reqItem.item.images && reqItem.item.images.length > 0 && (
                        <div className="w-12 h-12 rounded-md overflow-hidden">
                          <img
                            src={getPrimaryImage(reqItem.item.images).fileName ? `/uploads/${getPrimaryImage(reqItem.item.images).fileName}` : '/placeholder.jpg'}
                            alt={reqItem.item.description}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-bold">{reqItem.item.productCode}</div>
                        <div className="text-sm text-gray-600">{reqItem.item.description}</div>
                        <div className="text-xs text-gray-500">Quantity: {reqItem.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request as {approvalType === 'manager' ? 'Manager' : 'Storage Master'}?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">Request Details</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRequest.items.length} item(s) requested by {selectedRequest.user.name}
                </p>
                <p className="text-sm text-gray-600">
                  Period: {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">Request Details</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRequest.items.length} item(s) requested by {selectedRequest.user.name}
                </p>
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
              onClick={confirmReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? 'Processing...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}