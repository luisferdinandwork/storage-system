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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Plus, 
  Eye, 
  CheckSquare,
  XCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  MapPin
} from 'lucide-react';

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
  };
  requestedAt: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending_manager' | 'pending_storage' | 'approved' | 'rejected' | 'active' | 'complete' | 'seeded' | 'reverted';
  managerApprovedBy?: { id: string; name: string; } | null;
  storageApprovedBy?: { id: string; name: string; } | null;
}

export default function MyRequestsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ongoing');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalType, setApprovalType] = useState<'manager' | 'storage'>('manager');

  const ongoingStatuses = ['pending_manager', 'pending_storage', 'approved', 'active', 'seeded'];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/borrow-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        addMessage('error', 'Failed to fetch requests', 'Error');
      }
    } catch (error) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalType }),
      });

      if (response.ok) {
        setShowApproveModal(false);
        fetchRequests();
        addMessage('success', 'Request approved successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to approve', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to approve', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      addMessage('error', 'Please provide a rejection reason', 'Missing Information');
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rejectionReason: rejectionReason.trim(),
          rejectionType: approvalType 
        }),
      });

      if (response.ok) {
        setShowRejectModal(false);
        setRejectionReason('');
        fetchRequests();
        addMessage('success', 'Request rejected', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to reject', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to reject', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'ongoing') {
      if (!ongoingStatuses.includes(request.status)) return false;
    } else if (statusFilter !== 'all') {
      if (request.status !== statusFilter) return false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const itemMatches = request.items.some(reqItem => 
        reqItem.item.description.toLowerCase().includes(searchLower) ||
        reqItem.item.productCode.toLowerCase().includes(searchLower)
      );
      if (!itemMatches) return false;
    }
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_manager: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Manager' },
      pending_storage: { color: 'bg-blue-100 text-blue-800', label: 'Pending Storage' },
      approved: { color: 'bg-indigo-100 text-indigo-800', label: 'Approved' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      complete: { color: 'bg-gray-100 text-gray-800', label: 'Complete' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      seeded: { color: 'bg-purple-100 text-purple-800', label: 'Seeded' },
      reverted: { color: 'bg-orange-100 text-orange-800', label: 'Reverted' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: '', label: status };
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const getPrimaryImage = (images: any[]) => images.find(img => img.isPrimary) || images[0];

  const getApprovalActions = (request: BorrowRequest) => {
    const userRole = session?.user?.role;
    if (!userRole) return null;
    
    const actions = [];
    
    if (userRole === 'superadmin') {
      if (request.status === 'pending_manager') actions.push({ type: 'manager' as const, label: 'Approve (M)' });
      if (request.status === 'pending_storage') actions.push({ type: 'storage' as const, label: 'Approve (S)' });
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
    <div className="p-6 space-y-4">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Lending Requests</h1>
          <p className="text-gray-600">View and manage your active borrow requests</p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard/requests/new-requests'}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending_manager').length}
                </div>
                <p className="text-xs text-gray-500">Pending Manager</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {requests.filter(r => r.status === 'pending_storage').length}
                </div>
                <p className="text-xs text-gray-500">Pending Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'active').length}
                </div>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {requests.filter(r => r.status === 'seeded').length}
                </div>
                <p className="text-xs text-gray-500">Seeded</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <option value="ongoing">Ongoing</option>
          <option value="all">All</option>
          <option value="pending_manager">Pending Manager</option>
          <option value="pending_storage">Pending Storage</option>
          <option value="active">Active</option>
          <option value="seeded">Seeded</option>
          <option value="complete">Complete</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
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
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="space-y-2">
                      {request.items.map((reqItem) => (
                        <div key={reqItem.id} className="flex items-center space-x-3">
                          {reqItem.item.images?.length > 0 && (
                            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={getPrimaryImage(reqItem.item.images).fileName ? `/uploads/${getPrimaryImage(reqItem.item.images).fileName}` : '/placeholder.jpg'}
                                alt={reqItem.item.description}
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
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setShowDetailsModal(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {getApprovalActions(request)?.map((action) => (
                        <div key={action.type} className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request, action.type)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckSquare className="h-4 w-4" />
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
                      {reqItem.item.images?.length > 0 && (
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
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Approve as {approvalType === 'manager' ? 'Manager' : 'Storage Master'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button onClick={confirmApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
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
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={isProcessing || !rejectionReason.trim()}>
              {isProcessing ? 'Processing...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}