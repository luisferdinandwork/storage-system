// app/dashboard/clearance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageContainer } from '@/components/ui/message';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessages } from '@/hooks/use-messages';
import { FormDetail } from '@/components/clearance/FormDetail';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle,
  Send,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Package,
  MapPin,
  Calendar,
  User
} from 'lucide-react';

// Interfaces remain the same as in the original page
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

export default function ClearanceFormsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [clearanceForms, setClearanceForms] = useState<ClearanceForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<ClearanceForm | null>(null);
  const [formItems, setFormItems] = useState<ClearanceFormItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchClearanceForms();
  }, []);

  const fetchClearanceForms = async () => {
    try {
      const response = await fetch('/api/clearance-forms');
      if (response.ok) {
        const data = await response.json();
        setClearanceForms(data.forms || []);
      } else {
        addMessage('error', 'Failed to fetch clearance forms', 'Error');
        setClearanceForms([]);
      }
    } catch (error) {
      console.error('Failed to fetch clearance forms:', error);
      addMessage('error', 'Failed to fetch clearance forms', 'Error');
      setClearanceForms([]);
    } finally {
      setIsLoading(false);
    }
  };

  // app/dashboard/clearance/page.tsx
  const fetchFormDetails = async (formId: string) => {
    try {
      const response = await fetch(`/api/clearance-forms/${formId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          setSelectedForm(data);
          setFormItems(data.items || []);
        } else {
          addMessage('error', 'Invalid form data received', 'Error');
        }
      } else {
        addMessage('error', 'Failed to fetch form details', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch form details:', error);
      addMessage('error', 'Failed to fetch form details', 'Error');
    }
  };

  const handleSubmitForm = async (formId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/clearance-forms/submit-for-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formId }),
      });

      if (response.ok) {
        setSelectedForm(null);
        fetchClearanceForms();
        addMessage('success', 'Form submitted for approval successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to submit form', 'Error');
      }
    } catch (error) {
      console.error('Failed to submit form:', error);
      addMessage('error', 'Failed to submit form', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveForm = async (formId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/clearance-forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        setSelectedForm(null);
        fetchClearanceForms();
        addMessage('success', 'Form approved successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to approve form', 'Error');
      }
    } catch (error) {
      console.error('Failed to approve form:', error);
      addMessage('error', 'Failed to approve form', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectForm = async (formId: string, reason: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/clearance-forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      });

      if (response.ok) {
        setSelectedForm(null);
        fetchClearanceForms();
        addMessage('success', 'Form rejected successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to reject form', 'Error');
      }
    } catch (error) {
      console.error('Failed to reject form:', error);
      addMessage('error', 'Failed to reject form', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessForm = async (formId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/clearance-forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'process' }),
      });

      if (response.ok) {
        setSelectedForm(null);
        fetchClearanceForms();
        addMessage('success', 'Form processed successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to process form', 'Error');
      }
    } catch (error) {
      console.error('Failed to process form:', error);
      addMessage('error', 'Failed to process form', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewFormDetails = async (form: ClearanceForm) => {
    await fetchFormDetails(form.id);
  };

  const filteredForms = clearanceForms.filter(form => {
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesStatus;
  });

  const userRole = session?.user?.role;
  const canManageClearance = userRole === 'storage-master' || userRole === 'storage-master-manager' || userRole === 'superadmin';
  const canApproveClearance = userRole === 'storage-master-manager' || userRole === 'superadmin';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-5 w-5" />;
      case 'pending_approval':
        return <Clock className="h-5 w-5" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      case 'processed':
        return <Package className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clearance Forms</h1>
          <p className="text-gray-600 mt-1">Manage item clearance forms and processes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <Card key={form.id} className="overflow-hidden border-l-4" style={{
              borderLeftColor: 
                form.status === 'draft' ? '#9CA3AF' :
                form.status === 'pending_approval' ? '#FBBF24' :
                form.status === 'approved' ? '#10B981' :
                form.status === 'rejected' ? '#EF4444' :
                '#3B82F6'
            }}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{form.title}</CardTitle>
                    <CardDescription className="text-sm">Form #{form.formNumber}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(form.status)}
                    <Badge className={getStatusColor(form.status)} variant="outline">
                      {form.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{form.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Period</p>
                    <p className="font-medium">{form.period}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Items</p>
                    <p className="font-medium">{form.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-medium">{form.totalQuantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">{new Date(form.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-500">
                    Created by {form.createdBy.name}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewFormDetails(form)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      
                      {form.status === 'draft' && canManageClearance && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleSubmitForm(form.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Submit for Approval
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {form.status === 'pending_approval' && canApproveClearance && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleApproveForm(form.id)} className="text-green-600">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRejectForm(form.id, '')} className="text-red-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {form.status === 'approved' && canManageClearance && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleProcessForm(form.id)} className="text-blue-600">
                            <Clock className="mr-2 h-4 w-4" />
                            Process Form
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredForms.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clearance forms found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter !== 'all' 
              ? 'Try selecting a different status filter' 
              : 'Create a new clearance form to get started'}
          </p>
        </div>
      )}

      {/* Form Detail Modal */}
      {selectedForm && (
        <FormDetail
          form={selectedForm}
          items={formItems}
          onClose={() => setSelectedForm(null)}
          onSubmit={handleSubmitForm}
          onApprove={handleApproveForm}
          onReject={handleRejectForm}
          onProcess={handleProcessForm}
          canApprove={canApproveClearance}
          canManage={canManageClearance}
        />
      )}
    </div>
  );
}