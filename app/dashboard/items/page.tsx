// app/dashboard/items/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Filter, Columns, Upload, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddItemModal } from '@/components/items/add-item-modal';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { ItemsTable } from '@/components/items/items-table';
import { ColumnSelector } from '@/components/items/column-selector';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { useExportItems } from '@/hooks/use-export-items';

// Define all possible columns
const ALL_COLUMNS = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'brandCode', label: 'Brand', defaultVisible: true },
  { id: 'productDivision', label: 'Division', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'unit', label: 'Unit', defaultVisible: true },
  { id: 'condition', label: 'Condition', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'createdBy', label: 'Created By', defaultVisible: true },
  { id: 'stock', label: 'Stock', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

export default function ItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
  );
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use the export hook
  const { exportItems, isExporting } = useExportItems();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        setCurrentPage(1); // Reset to first page when items change
      } else {
        addMessage('error', 'Failed to fetch items', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      addMessage('error', 'Failed to fetch items', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItemSuccess = () => {
    setShowAddModal(false);
    fetchItems();
    addMessage('success', 'Item added successfully', 'Success');
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchItems();
        addMessage('success', 'Item deleted successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to remove item', 'Error');
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      addMessage('error', 'Failed to remove item', 'Error');
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns(
      ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
    );
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    // Get filtered item IDs based on current filters
    const filteredItemIds = filteredItems.map(item => item.id);
    
    // Export the filtered items
    await exportItems(filteredItemIds, format);
  };

  const handleExportAll = async (format: 'csv' | 'excel') => {
    // Export all items
    await exportItems([], format);
  };

  const handleDownloadTemplate = (format: 'csv' | 'excel') => {
    window.open(`/api/items/import/template?format=${format}`);
  };

  const handleEditItem = () => {
    fetchItems(); // Refetch items after edit
    addMessage('success', 'Item updated successfully', 'Success');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/items/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setImportResults(result);
        fetchItems();
        
        if (result.results.success > 0) {
          addMessage('success', `${result.results.success} items imported successfully`, 'Success');
        }
        
        if (result.results.failed > 0) {
          addMessage('error', `${result.results.failed} items failed to import`, 'Error');
        }
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to import items', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Failed to import items', 'Error');
    } finally {
      setIsImporting(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.productCategory === categoryFilter;
    const matchesLocation = locationFilter === 'all' || item.stock?.location === locationFilter;
    const matchesUnit = unitFilter === 'all' || item.unitOfMeasure === unitFilter;
    const matchesCondition = conditionFilter === 'all' || item.stock?.condition === conditionFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesUnit && matchesCondition && matchesStatus;
  });

  // Calculate pagination
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const userRole = session?.user?.role;
  const isSuperAdmin = userRole === 'superadmin';
  const isItemMaster = userRole === 'item-master';
  
  const canAddItem = isSuperAdmin || isItemMaster;
  const canEditItem = isSuperAdmin || isItemMaster;
  const canDeleteItem = isSuperAdmin;
  const canExportItems = isSuperAdmin || isItemMaster;

  // Custom action for borrowing items (example)
  const renderBorrowAction = (item: any) => {
    if (item.status === 'available' && item.stock?.location) {
      return (
        <DropdownMenuItem>
          Borrow Item
        </DropdownMenuItem>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Items</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setShowColumnSelector(true)}
          >
            <Columns className="mr-2 h-4 w-4" />
            Columns
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExportAll('csv')} disabled={isExporting}>
                Export All as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAll('excel')} disabled={isExporting}>
                Export All as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Import Options</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>
                Download CSV Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('excel')}>
                Download Excel Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                Import from File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {canAddItem && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="bg-primary-500 hover:bg-primary-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Handle File Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={showFilterPanel ? "bg-gray-100" : ""}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="00">Lifestyle</option>
                <option value="01">Football</option>
                <option value="02">Futsal</option>
                <option value="03">Street Soccer</option>
                <option value="04">Running</option>
                <option value="05">Training</option>
                <option value="06">Volley</option>
                <option value="08">Badminton</option>
                <option value="09">Tennis</option>
                <option value="10">Basketball</option>
                <option value="12">Skateboard</option>
                <option value="14">Swimming</option>
                <option value="17">Back to school</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Locations</option>
                <option value="Storage 1">Storage 1</option>
                <option value="Storage 2">Storage 2</option>
                <option value="Storage 3">Storage 3</option>
                <option value="">Not Assigned</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unitFilter}
                onChange={(e) => {
                  setUnitFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Units</option>
                <option value="PCS">Pieces (PCS)</option>
                <option value="PRS">Pairs (PRS)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="in_clearance">In Clearance</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <ItemsTable
        items={paginatedItems}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        isLoading={isLoading}
        onEditItem={handleEditItem}
        emptyMessage="No items found"
        emptyDescription="Try adjusting your search or filters"
        onDeleteItem={canDeleteItem ? handleRemoveItem : undefined}
        canEditItem={canEditItem}
        canDeleteItem={canDeleteItem}
        canExportItems={canExportItems}
        showActions={true}
        customActions={renderBorrowAction}
        onExportItems={exportItems}
        isExporting={isExporting}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        totalItems={totalItems}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddItemSuccess}
      />

      {/* Column Selector Modal */}
      <ColumnSelector
        isOpen={showColumnSelector}
        onClose={() => setShowColumnSelector(false)}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumnVisibility}
        onResetColumns={handleResetColumns}
      />

      {/* Import Results Modal */}
      <Dialog open={!!importResults} onOpenChange={() => setImportResults(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
            <DialogDescription>
              Import process completed
            </DialogDescription>
          </DialogHeader>
          {importResults && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Successful:</span>
                <span className="font-medium text-green-600">{importResults.results.success}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{importResults.results.failed}</span>
              </div>
              
              {importResults.results.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Errors:</h4>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                    {importResults.results.errors.map((error: any, index: number) => (
                      <div key={index} className="mb-1">
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportResults(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}