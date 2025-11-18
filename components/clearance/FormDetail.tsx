// components/clearance/FormDetail.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Package, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';

interface ClearanceForm {
  id: string;
  formNumber: string;
  title: string;
  description: string;
  period: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'processed';
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  processedAt: string | null;
  rejectionReason: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  approvedBy: {
    id: string;
    name: string;
  } | null;
  processedBy: {
    id: string;
    name: string;
  } | null;
  itemCount: number;
  totalQuantity: number;
}

interface ClearanceFormItem {
  id: string;
  itemId: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  conditionNotes: string | null;
  item: {
    productCode: string;
    description: string;
    brandCode: string;
    productDivision: string;
    productCategory: string;
    period: string;
    season: string;
    unitOfMeasure: string;
  };
  stock: {
    id: string;
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    conditionNotes: string | null;
    box: {
      id: string;
      boxNumber: string;
      location: {
        id: string;
        name: string;
      }
    } | null;
  };
}

interface FormDetailProps {
  form: ClearanceForm;
  items: ClearanceFormItem[];
  onClose: () => void;
  onApprove?: (formId: string) => void;
  onReject?: (formId: string, reason: string) => void;
  onProcess?: (formId: string) => void;
  onSubmit?: (formId: string) => void;
  canApprove?: boolean;
  canManage?: boolean;
}

export function FormDetail({ 
  form, 
  items, 
  onClose, 
  onApprove, 
  onReject, 
  onProcess, 
  onSubmit,
  canApprove = false,
  canManage = false 
}: FormDetailProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleReject = () => {
    if (onReject && rejectionReason.trim()) {
      onReject(form.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'processed':
        return <Package className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">{form.title}</DialogTitle>
              <p className="text-gray-500">Form #{form.formNumber}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Form Information</CardTitle>
                  <CardDescription>Details about this clearance form</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(form.status)}
                  <Badge className={getStatusColor(form.status)}>
                    {form.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{form.description || 'No description provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-medium">{form.period}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{new Date(form.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{form.createdBy.name}</p>
                  </div>
                </div>
                {form.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Approved</p>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{new Date(form.approvedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {form.approvedBy && (
                  <div>
                    <p className="text-sm text-gray-500">Approved By</p>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{form.approvedBy.name}</p>
                    </div>
                  </div>
                )}
                {form.processedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Processed</p>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{new Date(form.processedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {form.processedBy && (
                  <div>
                    <p className="text-sm text-gray-500">Processed By</p>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{form.processedBy.name}</p>
                    </div>
                  </div>
                )}
                {form.rejectionReason && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Rejection Reason</p>
                    <p className="font-medium text-red-600">{form.rejectionReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Package className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{form.itemCount}</p>
                    <p className="text-sm text-gray-500">Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{form.totalQuantity}</p>
                    <p className="text-sm text-gray-500">Total Quantity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(items.map(item => item.stock.box?.location.name || 'Unassigned')).size}
                    </p>
                    <p className="text-sm text-gray-500">Locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items in Clearance Form</CardTitle>
              <CardDescription>List of all items included in this clearance form</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.item.productCode}</span>
                          <span className="text-sm text-gray-500">{item.item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.item.brandCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.item.productDivision}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.item.productCategory}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.quantity}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getConditionColor(item.condition)}>
                          {item.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.stock.box ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{item.stock.box.boxNumber}</span>
                            <span className="text-sm text-gray-500">{item.stock.box.location.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {form.status === 'draft' && canManage && (
              <Button onClick={() => onSubmit && onSubmit(form.id)}>
                Submit for Approval
              </Button>
            )}
            {form.status === 'pending_approval' && canApprove && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRejectModal(true)}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Reject
                </Button>
                <Button onClick={() => onApprove && onApprove(form.id)}>
                  Approve
                </Button>
              </>
            )}
            {form.status === 'approved' && canManage && (
              <Button onClick={() => onProcess && onProcess(form.id)}>
                Process Form
              </Button>
            )}
          </div>
        </div>

        {/* Reject Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="rejectionReason" className="text-sm font-medium">
                  Rejection Reason
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  placeholder="Enter reason for rejection..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Reject Form
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}