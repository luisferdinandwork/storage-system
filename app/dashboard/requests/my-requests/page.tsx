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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Plus, 
  Eye, 
  Clock,
  AlertTriangle,
  CheckCircle,
  MapPin,
  XCircle
} from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/utils';

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
  status: 'pending_manager' | 'pending_storage' | 'approved' | 'rejected' | 'active' | 'complete' | 'seeded' | 'reverted';
  managerApprovedBy?: { id: string; name: string; } | null;
  storageApprovedBy?: { id: string; name: string; } | null;
}

export default function MyRequestsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);

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

  const isPlaceholderDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date.getFullYear() === 1970;
  };

  const calculateDaysLeft = (endDate: string): number | null => {
    if (isPlaceholderDate(endDate)) return null;
    
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysLeftColor = (daysLeft: number | null): string => {
    if (daysLeft === null) return 'text-gray-400';
    if (daysLeft < 0) return 'text-gray-600';
    if (daysLeft <= 3) return 'text-red-600 font-semibold';
    if (daysLeft <= 7) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  const filteredRequests = requests.filter(request => {
    if (statusFilter !== 'all') {
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
          <p className="text-gray-600">View and manage your borrow requests</p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard/requests/new-requests'}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {requests.filter(r => r.status === 'complete').length}
                </div>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="mr-2 h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {requests.filter(r => r.status === 'rejected').length}
                </div>
                <p className="text-xs text-gray-500">Rejected</p>
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
          <option value="all">All</option>
          <option value="pending_manager">Pending Manager</option>
          <option value="pending_storage">Pending Storage</option>
          <option value="approved">Approved</option>
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
              <TableHead>ID</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => {
                const daysLeft = calculateDaysLeft(request.endDate);
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.id}</TableCell>
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
                    <TableCell className="text-sm">
                      <div>{request.user.name}</div>
                      <div className="text-xs text-gray-500">{request.user.department?.name || 'No Department'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm" title={request.reason}>
                        {request.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const daysLeft = calculateDaysLeft(request.endDate);
                        if (daysLeft === null) {
                          return (
                            <div className="text-sm text-gray-400">
                              Pending approval
                            </div>
                          );
                        }
                        return (
                          <>
                            <div className={`text-sm font-medium ${getDaysLeftColor(daysLeft)}`}>
                              {daysLeft < 0 
                                ? `Ended (${Math.abs(daysLeft)} days ago)` 
                                : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              End: {formatDate(request.endDate, { format: 'short' })}
                            </div>
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setShowDetailsModal(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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
                  <span className="font-medium">Request ID:</span> {selectedRequest.id}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <span className="font-medium">Requested By:</span> {selectedRequest.user.name}
                </div>
                <div>
                  <span className="font-medium">Department:</span> {selectedRequest.user.department?.name || 'No Department'}
                </div>
                <div>
                  <span className="font-medium">Start Date:</span> {formatDate(selectedRequest.startDate, { format: 'datetime' })}
                </div>
                <div>
                  <span className="font-medium">End Date:</span> {formatDate(selectedRequest.endDate, { format: 'datetime' })}
                </div>
                <div>
                  <span className="font-medium">Start Date:</span> 
                  {isPlaceholderDate(selectedRequest.startDate) 
                    ? <span className="ml-2 text-gray-400">Will be set upon approval</span>
                    : formatDate(selectedRequest.startDate, { format: 'datetime' })
                  }
                </div>
                <div>
                  <span className="font-medium">End Date:</span> 
                  {isPlaceholderDate(selectedRequest.endDate)
                    ? <span className="ml-2 text-gray-400">Will be set upon approval</span>
                    : formatDate(selectedRequest.endDate, { format: 'datetime' })
                  }
                </div>
                <div>
                  <span className="font-medium">Days Left:</span> 
                  {(() => {
                    if (isPlaceholderDate(selectedRequest.endDate)) {
                      return <span className="ml-2 text-gray-400">Pending approval</span>;
                    }
                    const daysLeft = calculateDaysLeft(selectedRequest.endDate);
                    if (daysLeft === null) {
                      return <span className="ml-2 text-gray-400">Pending approval</span>;
                    }
                    return (
                      <span className={`ml-2 ${getDaysLeftColor(daysLeft)}`}>
                        {daysLeft < 0 
                          ? `Ended (${Math.abs(daysLeft)} days ago)` 
                          : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                        }
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <span className="font-medium">Requested At:</span> {formatDate(selectedRequest.requestedAt, { format: 'datetime' })}
                </div>
                {selectedRequest.managerApprovedBy && (
                  <div>
                    <span className="font-medium">Manager Approved By:</span> {selectedRequest.managerApprovedBy.name}
                  </div>
                )}
                {selectedRequest.storageApprovedBy && (
                  <div>
                    <span className="font-medium">Storage Approved By:</span> {selectedRequest.storageApprovedBy.name}
                  </div>
                )}
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
    </div>
  );
}