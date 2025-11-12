'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Filter, Columns, Upload, Download, Trash2, Archive, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddItemModal } from '@/components/items/add-item-modal';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { ItemsTable } from '@/components/items/items-table';
import { ColumnSelector } from '@/components/items/column-selector';
import { BulkDeleteDialog } from '@/components/items/bulk-delete-dialog';
import { BulkClearanceDialog, BulkClearanceItem } from '@/components/items/bulk-clearance-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useExportItems } from '@/hooks/use-export-items';

// Define all possible columns
const ALL_COLUMNS = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'brandCode', label: 'Brand', defaultVisible: true },
  { id: 'productDivision', label: 'Division', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'unit', label: 'Unit', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'box', label: 'Box', defaultVisible: true }, // Added box column
  { id: 'createdBy', label: 'Created By', defaultVisible: true },
  { id: 'stock', label: 'Stock', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: false },
  { id: 'condition', label: 'Condition', defaultVisible: false },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

export default function ItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]); // Added boxes state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [boxFilter, setBoxFilter] = useState<string>('all'); // Added box filter
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
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // Now stores productCodes
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkClearing, setIsBulkClearing] = useState(false);
  const [showBulkClearanceDialog, setShowBulkClearanceDialog] = useState(false);
  const [selectedItemsForClearance, setSelectedItemsForClearance] = useState<BulkClearanceItem[]>([]);
  
  // Use the export hook
  const { exportItems, isExporting } = useExportItems();

  useEffect(() => {
    fetchItems();
    fetchBoxes(); // Added fetchBoxes call
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

  // Added fetchBoxes function
  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes');
      if (response.ok) {
        const data = await response.json();
        setBoxes(data);
      } else {
        console.error('Failed to fetch boxes');
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    }
  };

  // Prepare selected items for clearance dialog
  useEffect(() => {
    const clearanceItems = selectedItems
      .map(productCode => {
        const item = items.find(i => i.productCode === productCode);
        if (!item || !item.stock) return null;
        
        return {
          itemId: item.productCode, // Now using productCode
          productCode: item.productCode,
          description: item.description,
          availableStock: item.stock.pending + item.stock.inStorage,
          quantity: item.stock.pending + item.stock.inStorage,
        };
      })
      .filter((item): item is BulkClearanceItem => item !== null);
    
    setSelectedItemsForClearance(clearanceItems);
  }, [selectedItems, items]);

  const handleAddItemSuccess = () => {
    setShowAddModal(false);
    fetchItems();
    addMessage('success', 'Item added successfully', 'Success');
  };

  const handleRemoveItem = async (productCode: string) => {
    try {
      const response = await fetch(`/api/items/${productCode}`, {
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

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/items/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productCodes: selectedItems }), // Changed to productCodes
      });

      if (response.ok) {
        const result = await response.json();
        fetchItems();
        setSelectedItems([]);
        setShowBulkDeleteDialog(false);
        addMessage('success', `${result.deletedCount} items deleted successfully`, 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to delete items', 'Error');
      }
    } catch (error) {
      console.error('Failed to bulk delete items:', error);
      addMessage('error', 'Failed to delete items', 'Error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkClearance = async (clearanceItems: BulkClearanceItem[], reason: string) => {
    setIsBulkClearing(true);
    try {
      const response = await fetch('/api/items/bulk-clearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: clearanceItems,
          reason 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        fetchItems();
        setSelectedItems([]);
        setShowBulkClearanceDialog(false);
        addMessage('success', `${result.results.length} items moved to clearance successfully`, 'Success');
        
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: any) => {
            addMessage('error', `Error with item: ${error.error}`, 'Error');
          });
        }
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to move items to clearance', 'Error');
      }
    } catch (error) {
      console.error('Failed to move items to clearance:', error);
      addMessage('error', 'Failed to move items to clearance', 'Error');
    } finally {
      setIsBulkClearing(false);
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
    // Get filtered item productCodes based on current filters
    const filteredProductCodes = filteredItems.map(item => item.productCode);
    
    // Export the filtered items
    await exportItems(filteredProductCodes, format);
  };

  const handleExportAll = async (format: 'csv' | 'excel') => {
    // Export all items
    await exportItems([], format);
  };

  const handleExportSelected = async (format: 'csv' | 'excel') => {
    // Export selected items
    await exportItems(selectedItems, format);
    // Clear selection after export
    setSelectedItems([]);
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
    const matchesLocation = locationFilter === 'all' || item.location?.name === locationFilter;
    const matchesBox = boxFilter === 'all' || item.box?.id === boxFilter; // Changed to compare by ID
    const matchesUnit = unitFilter === 'all' || item.unitOfMeasure === unitFilter;
    const matchesCondition = conditionFilter === 'all' || item.stock?.condition === conditionFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesBox && 
           matchesUnit && matchesCondition && matchesStatus;
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
  const canClearance = isSuperAdmin || isItemMaster;

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Items</h1>
        <div className="flex space-x-2">
         
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              
              {/* Export All Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" />
                  Export All
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleExportAll('csv')} disabled={isExporting}>
                    Export All as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportAll('excel')} disabled={isExporting}>
                    Export All as Excel
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Export Selected Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={cn(
                  selectedItems.length === 0 || isExporting ? "opacity-50 cursor-not-allowed" : ""
                )}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected ({selectedItems.length})
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (selectedItems.length > 0 && !isExporting) {
                        handleExportSelected('csv');
                      }
                    }} 
                    className={cn(
                      selectedItems.length === 0 || isExporting ? "opacity-50 cursor-not-allowed" : ""
                    )}
                  >
                    Export Selected as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (selectedItems.length > 0 && !isExporting) {
                        handleExportSelected('excel');
                      }
                    }} 
                    className={cn(
                      selectedItems.length === 0 || isExporting ? "opacity-50 cursor-not-allowed" : ""
                    )}
                  >
                    Export Selected as Excel
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Move to Clearance */}
              {canClearance && (
                <DropdownMenuItem 
                  disabled={selectedItems.length === 0 || isBulkClearing}
                  onClick={() => setShowBulkClearanceDialog(true)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Move to Clearance ({selectedItems.length})
                </DropdownMenuItem>
              )}
              
              {/* Delete Selected */}
              {canDeleteItem && (
                <DropdownMenuItem 
                  disabled={selectedItems.length === 0 || isBulkDeleting}
                  onClick={() => setShowBulkDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedItems.length})
                </DropdownMenuItem>
              )}
              
              {/* Import Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>
                    Download CSV Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadTemplate('excel')}>
                    Download Excel Template
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="bg-primary-100 text-primary-500 hover:bg-primary-200">
                    Import from File
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Add Item */}
            </DropdownMenuContent>
          </DropdownMenu>
               {/* Columns */}
              <Button onClick={() => setShowColumnSelector(true)}
                className="bg-primary-100 text-primary-500 hover:bg-primary-200">
                <Columns className="mr-2 h-4 w-4" />
                Columns
              </Button>
              {canAddItem && (
                <>
                  <Button 
                    onClick={() => setShowAddModal(true)} 
                    className="bg-primary-100 text-primary-500 hover:bg-primary-200"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Box</label>
              <select
                value={boxFilter}
                onChange={(e) => {
                  setBoxFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Boxes</option>
                {/* Dynamically populate boxes from API */}
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.boxNumber} {box.location ? `(${box.location.name})` : ''}
                  </option>
                ))}
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
        canClearanceItems={canClearance}
        canExportItems={canExportItems}
        showActions={true}
        onExportItems={exportItems}
        onClearanceItems={(productCodes) => setShowBulkClearanceDialog(true)}
        isExporting={isExporting}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        totalItems={totalItems}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
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

      {/* Bulk Delete Dialog Component */}
      <BulkDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        selectedItemsCount={selectedItems.length}
        onConfirm={handleBulkDelete}
        isDeleting={isBulkDeleting}
      />

      {/* Bulk Clearance Dialog Component */}
      <BulkClearanceDialog
        open={showBulkClearanceDialog}
        onOpenChange={setShowBulkClearanceDialog}
        selectedItems={selectedItemsForClearance}
        onConfirm={handleBulkClearance}
        isProcessing={isBulkClearing}
      />
    </div>
  );
}