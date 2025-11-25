'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Filter, Columns, Upload, Download, Trash2, Archive, ChevronRight, MoreHorizontal, Edit, Eye, X, Check } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define all possible columns
const ALL_COLUMNS = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'brandCode', label: 'Merek', defaultVisible: true },
  { id: 'productDivision', label: 'Divisi', defaultVisible: true },
  { id: 'category', label: 'Kategori', defaultVisible: true },
  { id: 'season', label: 'Musim', defaultVisible: true },
  { id: 'period', label: 'Periode', defaultVisible: true },
  { id: 'unit', label: 'Satuan', defaultVisible: true },
  { id: 'createdBy', label: 'Dibuat Oleh', defaultVisible: true },
  { id: 'stock', label: 'Stok', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'actions', label: 'Aksi', defaultVisible: true },
];

// Filter options
const CATEGORY_OPTIONS = [
  { value: '00', label: 'Lifestyle' },
  { value: '01', label: 'Football' },
  { value: '02', label: 'Futsal' },
  { value: '03', label: 'Street Soccer' },
  { value: '04', label: 'Running' },
  { value: '05', label: 'Training' },
  { value: '06', label: 'Volley' },
  { value: '08', label: 'Badminton' },
  { value: '09', label: 'Tennis' },
  { value: '10', label: 'Basketball' },
  { value: '12', label: 'Skateboard' },
  { value: '14', label: 'Swimming' },
  { value: '17', label: 'Back to school' },
];

const STATUS_OPTIONS = [
  { value: 'pending_approval', label: 'Menunggu Persetujuan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'available', label: 'Tersedia' },
  { value: 'borrowed', label: 'Dipinjam' },
  { value: 'in_clearance', label: 'Dalam Pembersihan' },
  { value: 'rejected', label: 'Ditolak' },
];

const UNIT_OPTIONS = [
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'PRS', label: 'Pairs (PRS)' },
];

export default function ItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [divisionFilters, setDivisionFilters] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [seasonFilters, setSeasonFilters] = useState<string[]>([]);
  const [periodFilters, setPeriodFilters] = useState<string[]>([]);
  const [unitFilters, setUnitFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
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
        addMessage('error', 'Gagal mengambil data item', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      addMessage('error', 'Gagal mengambil data item', 'Error');
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
    addMessage('success', 'Item berhasil ditambahkan', 'Sukses');
  };

  const handleRemoveItem = async (productCode: string) => {
    try {
      const response = await fetch(`/api/items/${productCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchItems();
        addMessage('success', 'Item berhasil dihapus', 'Sukses');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Gagal menghapus item', 'Error');
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      addMessage('error', 'Gagal menghapus item', 'Error');
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
        addMessage('success', `${result.deletedCount} item berhasil dihapus`, 'Sukses');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Gagal menghapus item', 'Error');
      }
    } catch (error) {
      console.error('Failed to bulk delete items:', error);
      addMessage('error', 'Gagal menghapus item', 'Error');
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
        addMessage('success', `${result.results.length} item berhasil dipindahkan ke pembersihan`, 'Sukses');
        
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: any) => {
            addMessage('error', `Error pada item: ${error.error}`, 'Error');
          });
        }
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Gagal memindahkan item ke pembersihan', 'Error');
      }
    } catch (error) {
      console.error('Failed to move items to clearance:', error);
      addMessage('error', 'Gagal memindahkan item ke pembersihan', 'Error');
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
    addMessage('success', 'Item berhasil diperbarui', 'Sukses');
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
          addMessage('success', `${result.results.success} item berhasil diimpor`, 'Sukses');
        }
        
        if (result.results.failed > 0) {
          addMessage('error', `${result.results.failed} item gagal diimpor`, 'Error');
        }
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Gagal mengimpor item', 'Error');
      }
    } catch (error) {
      addMessage('error', 'Gagal mengimpor item', 'Error');
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
    const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(item.productCategory);
    const matchesDivision = divisionFilters.length === 0 || divisionFilters.includes(item.productDivision);
    const matchesBrand = brandFilters.length === 0 || brandFilters.includes(item.brandCode);
    const matchesSeason = seasonFilters.length === 0 || seasonFilters.includes(item.season);
    const matchesPeriod = periodFilters.length === 0 || periodFilters.includes(item.period);
    const matchesUnit = unitFilters.length === 0 || unitFilters.includes(item.unitOfMeasure);
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(item.status);

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

  // Handle filter changes
  const handleCategoryFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setCategoryFilters(prev => [...prev, value]);
    } else {
      setCategoryFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  const handleDivisionFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setDivisionFilters(prev => [...prev, value]);
    } else {
      setDivisionFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  const handleBrandFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setBrandFilters(prev => [...prev, value]);
    } else {
      setBrandFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  const handleSeasonFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setSeasonFilters(prev => [...prev, value]);
    } else {
      setSeasonFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  const handlePeriodFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setPeriodFilters(prev => [...prev, value]);
    } else {
      setPeriodFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  const handleUnitFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setUnitFilters(prev => [...prev, value]);
    } else {
      setUnitFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setStatusFilters(prev => [...prev, value]);
    } else {
      setStatusFilters(prev => prev.filter(v => v !== value));
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setCategoryFilters([]);
    setDivisionFilters([]);
    setBrandFilters([]);
    setSeasonFilters([]);
    setPeriodFilters([]);
    setUnitFilters([]);
    setStatusFilters([]);
    setCurrentPage(1);
  };

  // Check if any filter is active
  const hasActiveFilters = categoryFilters.length > 0 || 
                          divisionFilters.length > 0 || 
                          brandFilters.length > 0 || 
                          seasonFilters.length > 0 || 
                          periodFilters.length > 0 || 
                          unitFilters.length > 0 || 
                          statusFilters.length > 0;

  // Get filter label by value
  const getCategoryLabel = (value: string) => {
    const category = CATEGORY_OPTIONS.find(c => c.value === value);
    return category ? category.label : value;
  };

  const getStatusLabel = (value: string) => {
    const status = STATUS_OPTIONS.find(s => s.value === value);
    return status ? status.label : value;
  };

  const getUnitLabel = (value: string) => {
    const unit = UNIT_OPTIONS.find(u => u.value === value);
    return unit ? unit.label : value;
  };

  return (
    <div className="space-y-6">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Item</h1>
          <p className="text-gray-500 mt-1">Kelola item inventaris Anda</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Aksi Item</DropdownMenuLabel>
              
              {/* Export All Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" />
                  Ekspor Semua
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleExportAll('csv')} disabled={isExporting}>
                    Ekspor Semua sebagai CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportAll('excel')} disabled={isExporting}>
                    Ekspor Semua sebagai Excel
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Export Selected Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={cn(
                  selectedItems.length === 0 || isExporting ? "opacity-50 cursor-not-allowed" : ""
                )}>
                  <Download className="mr-2 h-4 w-4" />
                  Ekspor yang Dipilih ({selectedItems.length})
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
                    Ekspor yang Dipilih sebagai CSV
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
                    Ekspor yang Dipilih sebagai Excel
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
                    className="bg-orange-100 text-orange-500"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Pindah ke Clearance ({selectedItems.length})
                  </DropdownMenuItem>
                </>
              )}
              
              {/* Import Submenu */}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Upload className="mr-2 h-4 w-4" />
                  Impor
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>
                    Unduh Template CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadTemplate('excel')}>
                    Unduh Template Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="bg-primary-100 text-primary-500 hover:bg-primary-200">
                    Impor dari File
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Columns Button */}
          <Button onClick={() => setShowColumnSelector(true)} variant="outline" className="gap-2">
            <Columns className="h-4 w-4" />
            Kolom
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
              Hapus yang Dipilih ({selectedItems.length})
            </Button>
          )}
          
          {/* Add Item Button */}
          {canAddItem && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="bg-primary-600 hover:bg-primary-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Tambah Item
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
            placeholder="Cari item berdasarkan nama atau kode..."
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
          Filter
          {hasActiveFilters && (
            <span className="ml-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {categoryFilters.length + divisionFilters.length + brandFilters.length + 
               seasonFilters.length + periodFilters.length + unitFilters.length + statusFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">Filter aktif:</span>
          
          {categoryFilters.map(value => (
            <Badge key={`cat-${value}`} variant="secondary" className="flex items-center gap-1">
              Kategori: {getCategoryLabel(value)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleCategoryFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          {divisionFilters.map(value => (
            <Badge key={`div-${value}`} variant="secondary" className="flex items-center gap-1">
              Divisi: {value}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleDivisionFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          {brandFilters.map(value => (
            <Badge key={`brand-${value}`} variant="secondary" className="flex items-center gap-1">
              Merek: {value}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleBrandFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          {seasonFilters.map(value => (
            <Badge key={`season-${value}`} variant="secondary" className="flex items-center gap-1">
              Musim: {value}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSeasonFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          {periodFilters.map(value => (
            <Badge key={`period-${value}`} variant="secondary" className="flex items-center gap-1">
              Periode: {value}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handlePeriodFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          {unitFilters.map(value => (
            <Badge key={`unit-${value}`} variant="secondary" className="flex items-center gap-1">
              Satuan: {getUnitLabel(value)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleUnitFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          {statusFilters.map(value => (
            <Badge key={`status-${value}`} variant="secondary" className="flex items-center gap-1">
              Status: {getStatusLabel(value)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleStatusFilterChange(value, false)}
              />
            </Badge>
          ))}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs"
          >
            Hapus Semua
          </Button>
        </div>
      )}

      {/* Filter Panel Overlay */}
      {showFilterPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Filter Item</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowFilterPanel(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-gray-500 mt-1">Pilih filter untuk menyaring item</p>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="font-medium mb-3">Kategori</h3>
                  <div className="space-y-2">
                    {CATEGORY_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${option.value}`}
                          checked={categoryFilters.includes(option.value)}
                          onCheckedChange={(checked) => 
                            handleCategoryFilterChange(option.value, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`category-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Division Filter */}
                <div>
                  <h3 className="font-medium mb-3">Divisi</h3>
                  <div className="space-y-2">
                    {uniqueDivisions.map(division => (
                      <div key={division} className="flex items-center space-x-2">
                        <Checkbox
                          id={`division-${division}`}
                          checked={divisionFilters.includes(division)}
                          onCheckedChange={(checked) => 
                            handleDivisionFilterChange(division, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`division-${division}`}
                          className="text-sm cursor-pointer"
                        >
                          {division}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Brand Filter */}
                <div>
                  <h3 className="font-medium mb-3">Merek</h3>
                  <div className="space-y-2">
                    {uniqueBrands.map(brand => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand}`}
                          checked={brandFilters.includes(brand)}
                          onCheckedChange={(checked) => 
                            handleBrandFilterChange(brand, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`brand-${brand}`}
                          className="text-sm cursor-pointer"
                        >
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Season Filter */}
                <div>
                  <h3 className="font-medium mb-3">Musim</h3>
                  <div className="space-y-2">
                    {uniqueSeasons.map(season => (
                      <div key={season} className="flex items-center space-x-2">
                        <Checkbox
                          id={`season-${season}`}
                          checked={seasonFilters.includes(season)}
                          onCheckedChange={(checked) => 
                            handleSeasonFilterChange(season, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`season-${season}`}
                          className="text-sm cursor-pointer"
                        >
                          {season}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Period Filter */}
                <div>
                  <h3 className="font-medium mb-3">Periode</h3>
                  <div className="space-y-2">
                    {uniquePeriods.map(period => (
                      <div key={period} className="flex items-center space-x-2">
                        <Checkbox
                          id={`period-${period}`}
                          checked={periodFilters.includes(period)}
                          onCheckedChange={(checked) => 
                            handlePeriodFilterChange(period, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`period-${period}`}
                          className="text-sm cursor-pointer"
                        >
                          {period}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Unit Filter */}
                <div>
                  <h3 className="font-medium mb-3">Satuan</h3>
                  <div className="space-y-2">
                    {UNIT_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`unit-${option.value}`}
                          checked={unitFilters.includes(option.value)}
                          onCheckedChange={(checked) => 
                            handleUnitFilterChange(option.value, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`unit-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Status Filter */}
                <div>
                  <h3 className="font-medium mb-3">Status</h3>
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={statusFilters.includes(option.value)}
                          onCheckedChange={(checked) => 
                            handleStatusFilterChange(option.value, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`status-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-6 border-t flex justify-between">
              <Button 
                variant="outline" 
                onClick={clearAllFilters}
              >
                Hapus Semua Filter
              </Button>
              <Button 
                onClick={() => setShowFilterPanel(false)}
                className="bg-primary hover:bg-primary/90"
              >
                Terapkan Filter
              </Button>
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
        emptyMessage="Tidak ada item yang ditemukan"
        emptyDescription="Coba sesuaikan pencarian atau filter Anda"
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
            <DialogTitle>Hasil Impor</DialogTitle>
            <DialogDescription>
              Proses impor selesai
            </DialogDescription>
          </DialogHeader>
          {importResults && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Berhasil:</span>
                <span className="font-medium text-green-600">{importResults.results.success}</span>
              </div>
              <div className="flex justify-between">
                <span>Gagal:</span>
                <span className="font-medium text-red-600">{importResults.results.failed}</span>
              </div>
              
              {importResults.results.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Kesalahan:</h4>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                    {importResults.results.errors.map((error: any, index: number) => (
                      <div key={index} className="mb-1">
                        Baris {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportResults(null)}>Tutup</Button>
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