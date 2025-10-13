// app/dashboard/requests/overdue/page.tsx
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
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { 
  Search, 
  AlertTriangle, 
  Mail, 
  Phone,
  Calendar,
  MapPin,
  User,
  Eye,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

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
  status: 'overdue';
  dueDate: string;
  managerApprovedBy?: {
    id: string;
    name: string;
  };
  storageApprovedBy?: {
    id: string;
    name: string;
  };
}

export default function OverdueItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/borrow-requests');
      if (response.ok) {
        const data = await response.json();
        // Filter for overdue requests
        const filteredData = data.filter((req: BorrowRequest) => 
          req.status === 'overdue' || 
          (req.dueDate && new Date(req.dueDate) < new Date())
        );
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

  const handleSendReminder = async (request: BorrowRequest) => {
    try {
      const response = await fetch(`/api/borrow-requests/${request.id}/remind`, {
        method: 'POST',
      });

      if (response.ok) {
        addMessage('success', 'Reminder sent successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to send reminder', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to send reminder', 'Error');
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
          <h1 className="text-2xl font-bold text-gray-900">Overdue Items</h1>
          <p className="text-gray-600">View and manage overdue borrowed items</p>
        </div>
        <Badge variant="outline" className="bg-red-100 text-red-800">
          {requests.length} Overdue Items
        </Badge>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search overdue items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Overdue Items Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Borrowed By</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id} className="bg-red-50">
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{request.item.description}</div>
                    <div className="text-sm text-gray-500">{request.item.productCode}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getBrandBadge(request.item.brandCode)}
                      {getCategoryBadge(request.item.productCategory)}
                    </div>
                    {request.item.location && (
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {request.item.location}
                      </div>
                    )}
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
                <TableCell>
                  <div className="text-sm font-medium text-red-600">
                    {new Date(request.dueDate).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive" className="font-medium">
                    {getDaysOverdue(request.dueDate)} days
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`mailto:${request.user.email}`)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </TableCell>
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
                      onClick={() => handleSendReminder(request)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Remind
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
            <DialogTitle>Overdue Item Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-red-800">Item is Overdue</h4>
                    <p className="text-sm text-red-600">
                      {getDaysOverdue(selectedRequest.dueDate)} days overdue
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item</Label>
                  <p className="font-medium">{selectedRequest.item.description}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.item.productCode}</p>
                </div>
                <div>
                  <Label>Borrowed By</Label>
                  <p className="font-medium">{selectedRequest.user.name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.user.email}</p>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <p className="font-medium">{selectedRequest.quantity}</p>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p className="font-medium text-red-600">
                    {new Date(selectedRequest.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label>Borrow Period</Label>
                  <p className="text-sm">
                    {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
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
    </div>
  );
}