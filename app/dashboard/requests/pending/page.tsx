// app/dashboard/requests/pending/page.tsx
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
  MapPin,
  User,
  Clock
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
  };
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
  quantity: number;
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

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
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

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/borrow-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
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
    const matchesSearch = request.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.user.name.toLowerCase().includes(searchTerm.toLowerCase());
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

  return (
    <div className="p-6 space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve borrow requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            {requests.filter(r => r.status === 'pending_manager').length} Manager Pending
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            {requests.filter(r => r.status === 'pending_storage').length} Storage Pending
          </Badge>
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            {requests.filter(r => r.status === 'pending_extension').length} Extensions
          </Badge>
        </div>
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
            <SelectItem value="pending_extension">Extension Request</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{request.item.description}</div>
                    <div className="text-sm text-gray-500">{request.item.productCode}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getBrandBadge(request.item.brandCode)}
                      {getCategoryBadge(request.item.productCategory)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{request.user.name}</div>
                    <div className="text-sm text-gray-500">{request.user.email}</div>
                    <div className="text-xs text-gray-400 capitalize">{request.user.role.replace('-', ' ')}</div>
                    {request.user.department && (
                      <div className="text-xs text-gray-400">{request.user.department.name}</div>
                    )}
                  </div>
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
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveModal(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item</Label>
                  <p className="font-medium">{selectedRequest.item.description}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.item.productCode}</p>
                </div>
                <div>
                  <Label>Requested By</Label>
                  <p className="font-medium">{selectedRequest.user.name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.user.email}</p>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <p className="font-medium">{selectedRequest.quantity}</p>
                </div>
                <div>
                  <Label>Period</Label>
                  <p className="text-sm">
                    {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Reason</Label>
                  <p className="text-sm">{selectedRequest.reason}</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRequest.item.description}</h4>
                <p className="text-sm text-gray-600">Requested by: {selectedRequest.user.name}</p>
                <p className="text-sm text-gray-600">Quantity: {selectedRequest.quantity}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRequest.item.description}</h4>
                <p className="text-sm text-gray-600">Requested by: {selectedRequest.user.name}</p>
              </div>
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
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
              onClick={handleReject} 
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}