// app/dashboard/requests/seeding/page.tsx
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
  Package, 
  Eye, 
  Calendar,
  User,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SeedingRecord {
  id: string;
  itemId: string;
  reason: string;
  status: string;
  requestedAt: string;
  approvedAt: string;
  clearedAt: string;
  metadata: {
    type: string;
    borrowRequestId: string;
    originalQuantity: number;
    estimatedValue?: number;
    seededBy: string;
    seededAt: string;
    notes?: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    item: {
      id: string;
      productCode: string;
      description: string;
    };
  };
  item: {
    id: string;
    productCode: string;
    description: string;
    brandCode: string;
    productDivision: string;
    productCategory: string;
    condition: string;
  };
  requestedByUser: {
    id: string;
    name: string;
    email: string;
  };
  approvedByUser: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SeedingItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [records, setRecords] = useState<SeedingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SeedingRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [restoreQuantity, setRestoreQuantity] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [dateFrom, dateTo]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      const response = await fetch(`/api/clearance/seeding?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        addMessage('error', 'Failed to fetch seeding records', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch seeding records:', error);
      addMessage('error', 'Failed to fetch seeding records', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = async () => {
    if (!selectedRecord || !revertReason.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/clearance/seeding/${selectedRecord.id}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reason: revertReason,
          restoreQuantity,
        }),
      });

      if (response.ok) {
        setShowRevertModal(false);
        setRevertReason('');
        setRestoreQuantity(false);
        setSelectedRecord(null);
        fetchRecords();
        addMessage('success', 'Seeding decision reverted', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to revert seeding', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to revert seeding', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.metadata.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'reverted':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Reverted</Badge>;
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

  const canRevertSeeding = session?.user?.role === 'superadmin';

  return (
    <div className="p-6 space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seeded Items</h1>
          <p className="text-gray-600">View and manage items that were not returned</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-purple-100 text-purple-800">
            {records.length} Seeded Items
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search seeded items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To date"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="reverted">Reverted</option>
          </select>
        </div>
      </div>

      {/* Seeded Items Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Original User</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Seeded At</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="bg-purple-50">
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{record.item.description}</div>
                    <div className="text-sm text-gray-500">{record.item.productCode}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getBrandBadge(record.item.brandCode)}
                      {getCategoryBadge(record.item.productCategory)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{record.metadata.user.name}</div>
                    <div className="text-sm text-gray-500">{record.metadata.user.email}</div>
                  </div>
                </TableCell>
                <TableCell>{record.metadata.originalQuantity}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(record.metadata.seededAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm max-w-xs truncate">{record.reason}</p>
                </TableCell>
                <TableCell>{getStatusBadge(record.status)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    {canRevertSeeding && record.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowRevertModal(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Revert
                      </Button>
                    )}
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
            <DialogTitle>Seeding Record Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-md">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-purple-800">Item Seeded</h4>
                    <p className="text-sm text-purple-600">
                      Seeded on {new Date(selectedRecord.metadata.seededAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item</Label>
                  <p className="font-medium">{selectedRecord.item.description}</p>
                  <p className="text-sm text-gray-500">{selectedRecord.item.productCode}</p>
                </div>
                <div>
                  <Label>Original User</Label>
                  <p className="font-medium">{selectedRecord.metadata.user.name}</p>
                  <p className="text-sm text-gray-500">{selectedRecord.metadata.user.email}</p>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <p className="font-medium">{selectedRecord.metadata.originalQuantity}</p>
                </div>
                <div>
                  <Label>Seeded By</Label>
                  <p className="font-medium">{selectedRecord.requestedByUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedRecord.requestedByUser.email}</p>
                </div>
                <div className="col-span-2">
                  <Label>Reason</Label>
                  <p className="text-sm">{selectedRecord.reason}</p>
                </div>
                {selectedRecord.metadata.notes && (
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <p className="text-sm">{selectedRecord.metadata.notes}</p>
                  </div>
                )}
                {selectedRecord.metadata.estimatedValue && (
                  <div>
                    <Label>Estimated Value</Label>
                    <p className="font-medium">${selectedRecord.metadata.estimatedValue}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Modal */}
      <Dialog open={showRevertModal} onOpenChange={setShowRevertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert Seeding Decision</DialogTitle>
            <DialogDescription>
              This will restore the item to available status
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium">{selectedRecord.item.description}</h4>
                <p className="text-sm text-gray-600">Quantity: {selectedRecord.metadata.originalQuantity}</p>
              </div>
              <div>
                <Label htmlFor="revertReason">Reason for Revert</Label>
                <Textarea
                  id="revertReason"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Enter reason for reverting this seeding decision..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="restoreQuantity"
                  checked={restoreQuantity}
                  onChange={(e) => setRestoreQuantity(e.target.checked)}
                />
                <Label htmlFor="restoreQuantity" className="text-sm">
                  Restore quantity to inventory
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevertModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRevert} 
              disabled={isProcessing || !revertReason.trim()}
            >
              {isProcessing ? 'Reverting...' : 'Revert Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}