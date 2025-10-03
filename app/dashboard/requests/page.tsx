// app/requests/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Clock, CheckCircle, XCircle, Plus, Package, Building, Filter, Shield, MoreHorizontal, Edit, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, calculateDaysLeft } from '@/lib/utils';
import { AddRequestModal } from '@/components/requests/add-request-modal';
import { EditRequestModal } from '@/components/requests/edit-request-modal';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Item {
  id: string;
  name: string;
  category: string;
}

interface ItemSize {
  id: string;
  size: string;
  quantity: number;
  available: number;
}

interface BorrowRequest {
  id: string;
  item: Item;
  itemSize: ItemSize;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    department?: {
      id: string;
      name: string;
    };
  };
  quantity: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'returned';
  managerApproved: boolean | null;
  adminApproved: boolean | null;
  managerApprovedBy?: {
    id: string;
    name: string;
  };
  adminApprovedBy?: {
    id: string;
    name: string;
  };
  managerApprovedAt?: string;
  adminApprovedAt?: string;
  rejectionReason?: string;
  returnedAt?: string;
}

export default function RequestsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<BorrowRequest | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const isUser = session?.user?.role === 'user';

  // Helper function to convert nullable boolean to boolean
  const isApproved = (approved: boolean | null) => approved === true;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
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

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        addMessage('success', result.message, 'Success');
        setApprovingRequestId(null);
        fetchRequests();
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to approve request', 'Error');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      addMessage('error', 'Failed to approve request', 'Error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      addMessage('warning', 'Please provide a reason for rejection', 'Validation Error');
      return;
    }
    
    try {
      const response = await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        setRejectionRequestId(null);
        setRejectionReason('');
        fetchRequests();
        addMessage('success', 'Request rejected successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to reject request', 'Error');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      addMessage('error', 'Failed to reject request', 'Error');
    }
  };

  const handleReturnItem = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/return`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to return item', 'Error');
        return;
      }

      fetchRequests();
      addMessage('success', 'Item returned successfully', 'Success');
    } catch (error) {
      console.error('Failed to return item:', error);
      addMessage('error', 'Failed to return item', 'Error');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRequests();
        addMessage('success', 'Request deleted successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to delete request', 'Error');
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
      addMessage('error', 'Failed to delete request', 'Error');
    }
  };

  const handleEditRequest = (request: BorrowRequest) => {
    setEditingRequest(request);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    fetchRequests();
    addMessage('success', 'Request updated successfully', 'Success');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'approved':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'returned':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Active</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'returned':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'shoes':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Shoes</Badge>;
      case 'apparel':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Apparel</Badge>;
      case 'accessories':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Accessories</Badge>;
      case 'equipment':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Equipment</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Admin</Badge>;
      case 'manager':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Manager</Badge>;
      case 'user':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const canApprove = (request: BorrowRequest) => {
    if (request.status !== 'pending') return false;
    
    if (isAdmin) {
      // Admin can approve if admin approval is pending
      return !isApproved(request.adminApproved);
    }
    
    if (isManager) {
      // Manager can approve if:
      // 1. The request is from a regular user (not a manager)
      // 2. Manager approval is pending
      return request.user.role !== 'manager' && !isApproved(request.managerApproved);
    }
    
    return false;
  };

  // Filter requests based on status and search term
  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      request.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.itemSize.size.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Borrow Requests</h1>
          {isManager && (
            <p className="text-sm text-gray-500 mt-1">
              Showing requests from your department only
            </p>
          )}
        </div>
        {(isUser || isManager) && (
          <Button 
            onClick={() => setShowRequestModal(true)} 
            className="bg-primary-500 hover:bg-primary-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {/* Status Filter and Search */}
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
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="text-sm text-gray-500 flex items-center">
          {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} found
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Card className="border-0 shadow-none p-0">
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-2">
                          <Package className="h-5 w-5 text-gray-500" />
                          <div>
                            <div className="font-medium">{request.item.name}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              {getCategoryBadge(request.item.category)}
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                Size: {request.itemSize.size}
                              </Badge>
                              {request.quantity > 1 && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                  Qty: {request.quantity}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TableCell>
                  <TableCell>
                    <Card className="border-0 shadow-none p-0">
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {request.user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{request.user.name}</div>
                            <div className="text-sm text-gray-500">{request.user.email}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              {getRoleBadge(request.user.role)}
                              {request.user.department && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <Building className="h-3 w-3 mr-1" />
                                  {request.user.department.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TableCell>
                  <TableCell>
                    <Card className="border-0 shadow-none p-0">
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="text-sm">
                              {formatDate(new Date(request.startDate))} - {formatDate(new Date(request.endDate))}
                            </div>
                            {request.status === 'approved' && !request.returnedAt && (
                              <div className="text-sm text-gray-500">
                                {calculateDaysLeft(new Date(request.endDate))} days left
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                      {request.status === 'pending' && (
                        <div className="text-xs text-gray-500">
                          {request.user.role === 'manager' ? (
                            <span>
                              Admin: {isApproved(request.adminApproved) ? 
                                <span className="text-green-600">Approved</span> : 
                                <span className="text-amber-600">Pending</span>
                              }
                            </span>
                          ) : (
                            <div>
                              <div>
                                Manager: {isApproved(request.managerApproved) ? 
                                  <span className="text-green-600">Approved</span> : 
                                  <span className="text-amber-600">Pending</span>
                                }
                              </div>
                              <div>
                                Admin: {isApproved(request.adminApproved) ? 
                                  <span className="text-green-600">Approved</span> : 
                                  <span className="text-amber-600">Pending</span>
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={request.reason}>
                      {request.reason}
                    </div>
                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1">
                        Rejected: {request.rejectionReason}
                      </div>
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
                        
                        {request.status === 'pending' && canApprove(request) && (
                          <DropdownMenuItem
                            onClick={() => setApprovingRequestId(request.id)}
                            className="text-green-600"
                          >
                            Approve
                          </DropdownMenuItem>
                        )}
                        
                        {request.status === 'pending' && (isAdmin || isManager) && (
                          <DropdownMenuItem
                            onClick={() => setRejectionRequestId(request.id)}
                            className="text-red-600"
                          >
                            Reject
                          </DropdownMenuItem>
                        )}
                        
                        {request.status === 'approved' && !request.returnedAt && 
                         (isUser && request.user.id === session?.user?.id) && (
                          <DropdownMenuItem
                            onClick={() => handleReturnItem(request.id)}
                          >
                            Return Item
                          </DropdownMenuItem>
                        )}
                        
                        {request.status === 'pending' && ( isUser ) && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEditRequest(request)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteRequest(request.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
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
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No borrow requests found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isUser ? 'Get started by creating a new borrow request' : 
             isManager ? 'No requests from your department yet' : 
             'No requests have been made yet'}
          </p>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {approvingRequestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Approve Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to approve this request?
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setApprovingRequestId(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleApproveRequest(approvingRequestId)}
                className="bg-green-500 hover:bg-green-600"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionRequestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Reject Request</h3>
            <p className="text-sm text-gray-600 mb-4">Reason for rejection:</p>
            <textarea
              className="w-full p-2 border border-gray-300 rounded mb-4"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionRequestId(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleRejectRequest(rejectionRequestId)}
                disabled={!rejectionReason.trim()}
                className="bg-red-500 hover:bg-red-600"
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Request Modal */}
      <AddRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={fetchRequests}
      />

      {/* Edit Request Modal */}
      <EditRequestModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        request={editingRequest}
      />
    </div>
  );
}