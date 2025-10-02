// app/dashboard/requests/page.tsx (Updated)

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Clock, CheckCircle, XCircle, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, calculateDaysLeft } from '@/lib/utils';
import { AddRequestModal } from '@/components/requests/add-request-modal';

interface BorrowRequest {
  id: string;
  item: {
    id: string;
    name: string;
    category: string;
    size: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  managerApproved: boolean;
  adminApproved: boolean;
  managerApprovedBy?: {
    name: string;
  };
  adminApprovedBy?: {
    name: string;
  };
  managerApprovedAt?: string;
  adminApprovedAt?: string;
  rejectionReason?: string;
  returnedAt?: string;
}

export default function RequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const isUser = session?.user?.role === 'user';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
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
        setApprovingRequestId(null);
        fetchRequests();
      } else {
        alert('Failed to approve request');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
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
      } else {
        alert('Failed to reject request');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request');
    }
  };

  const handleReturnItem = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/return`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchRequests();
      } else {
        alert('Failed to return item');
      }
    } catch (error) {
      console.error('Failed to return item:', error);
      alert('Failed to return item');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return '';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'shoes':
        return 'bg-blue-100 text-blue-800';
      case 'apparel':
        return 'bg-green-100 text-green-800';
      case 'accessories':
        return 'bg-purple-100 text-purple-800';
      case 'equipment':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canApprove = (request: BorrowRequest) => {
    if (request.status !== 'pending') return false;
    
    if (isAdmin && !request.adminApproved) return true;
    if (isManager && !request.managerApproved) return true;
    
    return false;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Borrow Requests</h1>
        {isUser && (
          <Button 
            onClick={() => setShowRequestModal(true)} 
            className="bg-primary-500 hover:bg-primary-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <Package className="mr-2 h-5 w-5 text-primary-500" />
                      {request.item.name}
                    </CardTitle>
                    <CardDescription>
                      Requested by {request.user.name} ({request.user.email})
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getStatusColor(request.status)
                    )}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getCategoryColor(request.item.category)
                  )}>
                    {request.item.category.charAt(0).toUpperCase() + request.item.category.slice(1)}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Size: {request.item.size}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Borrow Period</p>
                      <p className="font-medium">
                        {formatDate(new Date(request.startDate))} - {formatDate(new Date(request.endDate))}
                      </p>
                    </div>
                  </div>
                  {request.status === 'approved' && !request.returnedAt && (
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Days Left</p>
                        <p className="font-medium">{calculateDaysLeft(new Date(request.endDate))} days</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Reason</p>
                  <p>{request.reason}</p>
                </div>

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mb-4 p-3 bg-red-50 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {request.rejectionReason}
                    </p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div>
                      Manager Approval: {request.managerApproved ? 
                        <span className="text-green-600">Approved by {request.managerApprovedBy?.name}</span> : 
                        <span className="text-amber-600">Pending</span>
                      }
                    </div>
                    <div>
                      Admin Approval: {request.adminApproved ? 
                        <span className="text-green-600">Approved by {request.adminApprovedBy?.name}</span> : 
                        <span className="text-amber-600">Pending</span>
                      }
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 mt-4">
                  {request.status === 'pending' && canApprove(request) && (
                    <Button
                      onClick={() => setApprovingRequestId(request.id)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Approve
                    </Button>
                  )}
                  
                  {request.status === 'pending' && (isAdmin || isManager) && (
                    <Button
                      variant="outline"
                      onClick={() => setRejectionRequestId(request.id)}
                      className="text-red-500 border-red-500 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  )}
                  
                  {request.status === 'approved' && !request.returnedAt && 
                   (isUser && request.user.id === session?.user?.id) && (
                    <Button
                      onClick={() => handleReturnItem(request.id)}
                      className="bg-primary-500 hover:bg-primary-600"
                    >
                      Return Item
                    </Button>
                  )}
                </div>

                {approvingRequestId === request.id && (
                  <div className="mt-4 p-3 bg-green-50 rounded-md">
                    <p className="text-sm text-green-800 mb-2">
                      Are you sure you want to approve this request?
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setApprovingRequestId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {rejectionRequestId === request.id && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md">
                    <p className="text-sm text-red-800 mb-2">Reason for rejection:</p>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded mb-2"
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={!rejectionReason.trim()}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectionRequestId(null);
                          setRejectionReason('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No borrow requests found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isUser ? 'Get started by creating a new borrow request' : 'No requests have been made yet'}
          </p>
        </div>
      )}

      {/* Add Request Modal */}
      <AddRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={fetchRequests}
      />
    </div>
  );
}