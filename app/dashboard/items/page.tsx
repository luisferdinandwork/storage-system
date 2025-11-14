'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Filter, Columns, Upload, Download, Trash2, Archive, ChevronRight, MoreHorizontal, Edit, Eye, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define all possible columns
const ALL_COLUMNS = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'brandCode', label: 'Brand', defaultVisible: true },
  { id: 'productDivision', label: 'Division', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'season', label: 'Season', defaultVisible: true },
  { id: 'period', label: 'Period', defaultVisible: true },
  { id: 'unit', label: 'Unit', defaultVisible: true },
  { id: 'createdBy', label: 'Created By', defaultVisible: true },
  { id: 'stock', label: 'Stock', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

export default function ItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkClearing, setIsBulkClearing] = useState(false);
  const [showBulkClearanceDialog, setShowBulkClearanceDialog] = useState(false);
  const [selectedItemsForClearance, setSelectedItemsForClearance] = useState<BulkClearanceItem[]>([]);
  
  // Use the export hook
  const { exportItems, isExporting } = useExportItems();

  useEffect(() => {
    fetchItems();
    fetchBoxes();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        setCurrentPage(1);
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

  useEffect(() => {
    const clearanceItems = selectedItems
      .map(productCode => {
        const item = items.find(i => i.productCode === productCode);
        if (!item || !item.stock) return null;
        
        return {
          itemId: item.productCode,
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
        body: JSON.stringify({ productCodes: selectedItems }),
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
    const filteredProductCodes = filteredItems.map(item => item.productCode);
    await exportItems(filteredProductCodes, format);
  };

  const handleExportAll = async (format: 'csv' | 'excel') => {
    await exportItems([], format);
  };

  const handleExportSelected = async (format: 'csv' | 'excel') => {
    await exportItems(selectedItems, format);
    setSelectedItems([]);
  };

  const handleDownloadTemplate = (format: 'csv' | 'excel') => {
    window.open(`/api/items/import/template?format=${format}`);
  };

  const handleEditItem = () => {
    fetchItems();
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Get unique values for filters
  const uniqueDivisions = Array.from(new Set(items.map(item => item.productDivision))).sort();
  const uniqueBrands = Array.from(new Set(items.map(item => item.brandCode))).sort();
  const uniqueSeasons = Array.from(new Set(items.map(item => item.season))).sort();
  const uniquePeriods = Array.from(new Set(items.map(item => item.period))).sort();

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.productCategory === categoryFilter;
    const matchesDivision = divisionFilter === 'all' || item.productDivision === divisionFilter;
    const matchesBrand = brandFilter === 'all' || item.brandCode === brandFilter;
    const matchesSeason = seasonFilter === 'all' || item.season === seasonFilter;
    const matchesPeriod = periodFilter === 'all' || item.period === periodFilter;
    const matchesUnit = unitFilter === 'all' || item.unitOfMeasure === unitFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesDivision && matchesBrand && 
           matchesSeason && matchesPeriod && matchesUnit && matchesStatus;
  });

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
    <div className="space-y-6">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Items</h1>
          <p className="text-gray-500 mt-1">Manage your inventory items</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Item Actions</DropdownMenuLabel>
              
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
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    disabled={selectedItems.length === 0 || isBulkClearing}
                    onClick={() => setShowBulkClearanceDialog(true)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Move to Clearance ({selectedItems.length})
                  </DropdownMenuItem>
                </>
              )}
              
              {/* Import Submenu */}
              <DropdownMenuSeparator />
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
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Columns Button */}
          <Button onClick={() => setShowColumnSelector(true)} variant="outline" className="gap-2">
            <Columns className="h-4 w-4" />
            Columns
          </Button>
          
          {/* Delete Button - Only visible for SuperAdmin */}
          {canDeleteItem && (
            <Button 
              variant="destructive" 
              className="bg-red-600 hover:bg-red-700 gap-2"
              disabled={selectedItems.length === 0 || isBulkDeleting}
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedItems.length})
            </Button>
          )}
          
          {/* Add Item Button */}
          {canAddItem && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="bg-primary-600 hover:bg-primary-700 gap-2"
            >
              <Plus className="h-4 w-4" />
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items by name or code..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="00">Lifestyle</SelectItem>
                  <SelectItem value="01">Football</SelectItem>
                  <SelectItem value="02">Futsal</SelectItem>
                  <SelectItem value="03">Street Soccer</SelectItem>
                  <SelectItem value="04">Running</SelectItem>
                  <SelectItem value="05">Training</SelectItem>
                  <SelectItem value="06">Volley</SelectItem>
                  <SelectItem value="08">Badminton</SelectItem>
                  <SelectItem value="09">Tennis</SelectItem>
                  <SelectItem value="10">Basketball</SelectItem>
                  <SelectItem value="12">Skateboard</SelectItem>
                  <SelectItem value="14">Swimming</SelectItem>
                  <SelectItem value="17">Back to school</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
              <Select
                value={divisionFilter}
                onValueChange={(value) => {
                  setDivisionFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {uniqueDivisions.map(division => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <Select
                value={brandFilter}
                onValueChange={(value) => {
                  setBrandFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {uniqueBrands.map(brand => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
              <Select
                value={seasonFilter}
                onValueChange={(value) => {
                  setSeasonFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Seasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  {uniqueSeasons.map(season => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <Select
                value={periodFilter}
                onValueChange={(value) => {
                  setPeriodFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {uniquePeriods.map(period => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <Select
                value={unitFilter}
                onValueChange={(value) => {
                  setUnitFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                  <SelectItem value="PRS">Pairs (PRS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="borrowed">Borrowed</SelectItem>
                  <SelectItem value="in_clearance">In Clearance</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
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