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
  X,
  Download,
  Upload
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
  pdfPath: string | null;
  scannedFormPath: string | null;
  physicalCheckCompleted: boolean;
  clearedItems?: ClearedItem[];
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

interface ClearedItem {
  id: string;
  formId: string;
  formNumber: string;
  productCode: string;
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  period: string;
  season: string;
  unitOfMeasure: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  conditionNotes: string | null;
  boxId: string | null;
  boxNumber: string | null;
  locationId: string | null;
  locationName: string | null;
  clearedAt: string;
  clearedBy: string;
}

interface FormDetailProps {
  form: ClearanceForm;
  items: ClearanceFormItem[];
  onClose: () => void;
  onApprove?: (formId: string) => void;
  onReject?: (formId: string, reason: string) => void;
  onProcess?: (formId: string) => void;
  onSubmit?: (formId: string) => void;
  onGeneratePDF?: (formId: string) => void;
  onUploadScannedForm?: () => void;
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
  onGeneratePDF,
  onUploadScannedForm,
  canApprove = false,
  canManage = false 
}: FormDetailProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Determine which items to display and calculate stats
  const isProcessed = form.status === 'processed';
  const displayItems = isProcessed && form.clearedItems ? form.clearedItems : items;
  
  // Calculate item count and total quantity based on actual data
  const itemCount = displayItems.length;
  const totalQuantity = displayItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate unique locations
  const uniqueLocations = isProcessed && form.clearedItems
    ? new Set(form.clearedItems.map(item => item.locationName || 'Unassigned')).size
    : new Set(items.map(item => item.stock.box?.location.name || 'Unassigned')).size;

  const handleReject = () => {
    if (onReject && rejectionReason.trim()) {
      onReject(form.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const handleDownloadPDF = () => {
    if (form.pdfPath) {
      window.open(`/api/clearance-forms/${form.id}/generate-pdf`, '_blank');
    }
  };

  const handleViewScannedForm = () => {
    if (form.scannedFormPath) {
      window.open(form.scannedFormPath, '_blank');
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
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(form.status)}
                  <Badge className={getStatusColor(form.status)}>
                    {form.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  {form.period} • Created {new Date(form.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-3">{form.description || 'No description provided'}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Created By</p>
                  <p className="font-medium">{form.createdBy.name}</p>
                </div>
                {form.approvedBy && (
                  <div>
                    <p className="text-gray-500">Approved By</p>
                    <p className="font-medium">{form.approvedBy.name}</p>
                  </div>
                )}
                {form.processedBy && (
                  <div>
                    <p className="text-gray-500">Processed By</p>
                    <p className="font-medium">{form.processedBy.name}</p>
                  </div>
                )}
                {form.rejectionReason && (
                  <div className="md:col-span-2">
                    <p className="text-gray-500">Rejection Reason</p>
                    <p className="font-medium text-red-600">{form.rejectionReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PDF and Scanned Form Status */}
          {(form.status === 'approved' || form.status === 'processed') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Physical Verification</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-sm">PDF Form</p>
                        <p className="text-xs text-gray-500">
                          {form.pdfPath ? 'Generated' : 'Not generated'}
                        </p>
                      </div>
                    </div>
                    {form.pdfPath && (
                      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-sm">Scanned Form</p>
                        <p className="text-xs text-gray-500">
                          {form.scannedFormPath ? 'Uploaded' : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    {form.scannedFormPath ? (
                      <Button variant="outline" size="sm" onClick={handleViewScannedForm}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onUploadScannedForm}
                        className="text-purple-600 border-purple-300"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <Package className="h-6 w-6 text-blue-500" />
                <div className="flex gap-3 items-center">
                  <p className="text-xl font-bold">{itemCount}</p>
                  <p className="text-xs text-gray-500">Items</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <FileText className="h-6 w-6 text-green-500" />
                <div className="flex gap-3 items-center">
                  <p className="text-xl font-bold">{totalQuantity}</p>
                  <p className="text-xs text-gray-500">Quantity</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <MapPin className="h-6 w-6 text-purple-500" />
                <div className="flex gap-3 items-center">
                  <p className="text-xl font-bold">{uniqueLocations}</p>
                  <p className="text-xs text-gray-500">Locations</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isProcessed ? 'Cleared Items' : 'Items in Form'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Item</TableHead>
                      <TableHead className="w-[15%]">Brand</TableHead>
                      <TableHead className="w-[15%]">Category</TableHead>
                      <TableHead className="w-[10%]">Qty</TableHead>
                      <TableHead className="w-[15%]">Condition</TableHead>
                      <TableHead className="w-[20%]">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isProcessed && form.clearedItems ? (
                      form.clearedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.productCode}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.brandCode}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.productCategory}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{item.quantity}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getConditionColor(item.condition)} text-xs`}>
                              {item.condition}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.boxNumber ? (
                              <div>
                                <div className="font-medium">{item.boxNumber}</div>
                                <div className="text-xs text-gray-500">{item.locationName}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500">Unassigned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.item.productCode}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.item.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.item.brandCode}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.item.productCategory}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{item.quantity}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getConditionColor(item.condition)} text-xs`}>
                              {item.condition}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.stock.box ? (
                              <div>
                                <div className="font-medium">{item.stock.box.boxNumber}</div>
                                <div className="text-xs text-gray-500">{item.stock.box.location.name}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500">Unassigned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {form.status === 'processed' && (
            <div className="p-4 bg-green-50 rounded-md border border-green-200">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-green-800">Form processed successfully</h3>
                  <p className="text-sm text-green-700 mt-1">
                    All items have been cleared from inventory and permanently removed from the system.
                  </p>
                  {form.clearedItems && form.clearedItems.length > 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      {form.clearedItems.length} item(s) with a total quantity of {form.clearedItems.reduce((sum, item) => sum + item.quantity, 0)} have been processed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Status indicator for approved forms without scanned form */}
          {form.status === 'approved' && canManage && !form.scannedFormPath && (
            <div className="flex items-center p-2 bg-yellow-50 rounded-md text-yellow-700 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Upload scanned form before processing
            </div>
          )}
        </div>

        {/* Reject Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md">
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
                  className="w-full mt-1 p-2 border rounded-md text-sm"
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