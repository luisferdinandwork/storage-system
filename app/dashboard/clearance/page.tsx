// app/dashboard/clearance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageContainer } from '@/components/ui/message';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessages } from '@/hooks/use-messages';
import { FormDetail } from '@/components/clearance/FormDetail';
import { ScannedFormUploadModal } from '@/components/clearance/ScannedFormUploadModal';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle,
  Send,
  Clock,
  AlertCircle,
  Package,
  Download,
  Upload
} from 'lucide-react';

// Interfaces remain the same
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
  // Add these optional fields for detailed data
  items?: ClearanceFormItem[];
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

// Helper function to get accurate item count and quantity
function getFormStats(form: ClearanceForm) {
  const isProcessed = form.status === 'processed';
  
  if (isProcessed && form.clearedItems && form.clearedItems.length > 0) {
    return {
      itemCount: form.clearedItems.length,
      totalQuantity: form.clearedItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  } else if (form.items && form.items.length > 0) {
    return {
      itemCount: form.items.length,
      totalQuantity: form.items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }
  
  // Fallback to the values from the API
  return {
    itemCount: form.itemCount || 0,
    totalQuantity: form.totalQuantity || 0
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentFormForUpload, setCurrentFormForUpload] = useState<ClearanceForm | null>(null);

  useEffect(() => {
    fetchClearanceForms();
  }, []);

  const fetchClearanceForms = async () => {
    try {
      const response = await fetch('/api/clearance-forms');
      if (response.ok) {
        const data = await response.json();
        let forms = data.forms || [];
        
        // For processed forms, fetch detailed data to get clearedItems
        const processedForms = forms.filter((form: { status: string; }) => form.status === 'processed');
        if (processedForms.length > 0) {
          const detailedProcessedForms = await Promise.all(
            processedForms.map(async (form: { id: any; }) => {
              const detailResponse = await fetch(`/api/clearance-forms/${form.id}`);
              if (detailResponse.ok) {
                return await detailResponse.json();
              }
              return form;
            })
          );
          
          // Replace the processed forms in the forms array with detailed data
          forms = forms.map((form: { id: any; }) => {
            const detailedForm = detailedProcessedForms.find(df => df.id === form.id);
            return detailedForm || form;
          });
        }
        
        setClearanceForms(forms);
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

  const handleGeneratePDF = async (formId: string) => {
    setIsProcessing(true);
    try {
      // Open the PDF generation route in a new tab
      window.open(`/api/clearance-forms/${formId}/generate-pdf`, '_blank');
      
      // Update the form to mark PDF as generated
      const response = await fetch(`/api/clearance-forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark_pdf_generated' }),
      });

      if (response.ok) {
        fetchClearanceForms();
        addMessage('success', 'PDF generated successfully', 'Success');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to mark PDF as generated', 'Error');
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      addMessage('error', 'Failed to generate PDF', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessForm = async (formId: string) => {
    setIsProcessing(true);
    try {
      // First, fetch the latest form data to check if scanned form is uploaded
      const formResponse = await fetch(`/api/clearance-forms/${formId}`);
      if (!formResponse.ok) {
        addMessage('error', 'Failed to fetch form details', 'Error');
        return;
      }
      
      const formData = await formResponse.json();
      
      if (!formData.scannedFormPath) {
        addMessage('error', 'Please upload the scanned form before processing', 'Error');
        return;
      }

      const response = await fetch(`/api/clearance-forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'process' }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Refresh the forms list
        await fetchClearanceForms();
        
        // If this form is currently being viewed, refresh its details
        if (selectedForm && selectedForm.id === formId) {
          await fetchFormDetails(formId);
        }
        
        // Show success message with information about deleted items
        let message = 'Form processed successfully';
        if (result.deletedItems && result.deletedItems.length > 0) {
          message += `. ${result.deletedItems.length} item(s) were permanently removed from inventory.`;
        }
        
        addMessage('success', message, 'Success');
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

  const handleOpenUploadModal = (form: ClearanceForm) => {
    console.log('Opening upload modal for form:', form.id);
    setCurrentFormForUpload(form);
    setUploadModalOpen(true);
  };

  const handleUploadSuccess = async () => {
    console.log('Upload successful, refreshing data');
    
    // Refresh the forms list first
    await fetchClearanceForms();
    
    // If there's a form currently being viewed, refresh its details
    if (selectedForm) {
      console.log('Refreshing form details for:', selectedForm.id);
      await fetchFormDetails(selectedForm.id);
    }
    
    // Update the current form for upload with the latest data
    if (currentFormForUpload) {
      console.log('Refreshing current form for upload:', currentFormForUpload.id);
      
      try {
        const response = await fetch(`/api/clearance-forms/${currentFormForUpload.id}`);
        if (response.ok) {
          const formData = await response.json();
          if (formData && formData.id) {
            // Update the currentFormForUpload state with fresh data
            setCurrentFormForUpload(formData);
            
            // Also update the form in the clearanceForms array
            setClearanceForms(prevForms => 
              prevForms.map(form => 
                form.id === formData.id ? formData : form
              )
            );
          }
        }
      } catch (error) {
        console.error('Failed to fetch form details:', error);
      }
    }
    
    // Add a success message
    addMessage('success', 'Scanned form uploaded successfully. You can now process the form.', 'Success');
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
          {filteredForms.map((form) => {
            // Calculate accurate stats for each form
            const stats = getFormStats(form);
            
            return (
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
                      <p className="font-medium">{stats.itemCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium">{stats.totalQuantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">{new Date(form.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {/* Show PDF and Scanned Form status for approved forms */}
                  {form.status === 'approved' && (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        <span className={form.pdfPath ? 'text-green-600' : 'text-gray-500'}>
                          PDF: {form.pdfPath ? 'Generated' : 'Not Generated'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Upload className="h-3 w-3 mr-1" />
                        <span className={form.scannedFormPath ? 'text-green-600' : 'text-gray-500'}>
                          Scanned Form: {form.scannedFormPath ? 'Uploaded' : 'Not Uploaded'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Created by {form.createdBy.name}
                  </div>
                  
                  {/* Action buttons based on status */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewFormDetails(form)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    
                    {form.status === 'draft' && canManageClearance && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleSubmitForm(form.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="mr-1 h-4 w-4" />
                        Submit
                      </Button>
                    )}
                    
                    {form.status === 'pending_approval' && canApproveClearance && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleApproveForm(form.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleRejectForm(form.id, '')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {form.status === 'approved' && canManageClearance && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleGeneratePDF(form.id)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <Download className="mr-1 h-4 w-4" />
                          PDF
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenUploadModal(form)}
                          className="text-purple-600 border-purple-300 hover:bg-purple-50"
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          Upload
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleProcessForm(form.id)}
                          disabled={!form.scannedFormPath}
                          className={`${form.scannedFormPath ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                          <Clock className="mr-1 h-4 w-4" />
                          Process
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
          onGeneratePDF={handleGeneratePDF}
          onUploadScannedForm={() => handleOpenUploadModal(selectedForm)}
          canApprove={canApproveClearance}
          canManage={canManageClearance}
        />
      )}

      {/* Scanned Form Upload Modal */}
      {currentFormForUpload && (
        <ScannedFormUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          formId={currentFormForUpload.id}
          formNumber={currentFormForUpload.formNumber}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}