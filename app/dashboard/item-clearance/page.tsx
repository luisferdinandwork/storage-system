// app/dashboard/clearance-item/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageContainer } from '@/components/ui/message';
import { UniversalBadge } from '@/components/ui/universal-badge';
import { ItemDetailsModal } from '@/components/storage/ItemDetailsModal';
import { Checkbox } from '@/components/ui/checkbox';
import { useMessages } from '@/hooks/use-messages';
import { 
  Package, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Image,
  CheckSquare,
  FileText,
  Plus,
  RotateCcw,
  Download,
  Upload,
  FileDown,
} from 'lucide-react';

interface Box {
  id: string;
  boxNumber: string;
  description: string;
  location: {
    id: string;
    name: string;
  };
}

interface StockRecord {
  id: string;
  itemId: string;
  pending: number;
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
  boxId: string | null;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  conditionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClearanceRecord {
  id: string;
  itemId: string;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  clearedAt: string | null;
  metadata: any;
}

interface Item {
  productCode: string;
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  period: string;
  season: string;
  unitOfMeasure: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdByUser?: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    itemId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    altText: string | null;
    isPrimary: boolean;
    createdAt: string;
  }[];
  stock: StockRecord | null;
  clearances: ClearanceRecord[];
  location: {
    id: string;
    name: string;
    boxId: string;
    boxNumber: string;
  } | null;
}

export default function ClearanceItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [clearanceItems, setClearanceItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{itemId: string, stockId: string, quantity: number}[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPeriod, setFormPeriod] = useState('');
  const [revertReason, setRevertReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  useEffect(() => {
    fetchClearanceItems();
    fetchBoxes();
  }, []);

  const fetchClearanceItems = async () => {
    try {
      const response = await fetch('/api/items/clearance');
      if (response.ok) {
        const data = await response.json();
        // Ensure data.items is an array
        setClearanceItems(data.items || []);
      } else {
        addMessage('error', 'Failed to fetch clearance items', 'Error');
        setClearanceItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch clearance items:', error);
      addMessage('error', 'Failed to fetch clearance items', 'Error');
      setClearanceItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes');
      if (response.ok) {
        const data = await response.json();
        setBoxes(data || []);
      } else {
        addMessage('error', 'Failed to fetch boxes', 'Error');
        setBoxes([]);
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
      addMessage('error', 'Failed to fetch boxes', 'Error');
      setBoxes([]);
    }
  };

  const handleExport = async () => {
    try {
      // Apply current filters to the export
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (seasonFilter !== 'all') params.append('season', seasonFilter);
      if (brandFilter !== 'all') params.append('brand', brandFilter);
      if (divisionFilter !== 'all') params.append('division', divisionFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (periodFilter !== 'all') params.append('period', periodFilter);

      // Create the URL with query parameters
      const url = `/api/clearance-items/export?${params.toString()}`;
      
      // Create a temporary link to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clearance-items.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      addMessage('success', 'Clearance items exported successfully', 'Success');
    } catch (error) {
      console.error('Failed to export clearance items:', error);
      addMessage('error', 'Failed to export clearance items', 'Error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Create the URL for the template
      const url = '/api/clearance-items/import/template?format=excel';
      
      // Create a temporary link to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clearance-items-import-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      addMessage('success', 'Template downloaded successfully', 'Success');
    } catch (error) {
      console.error('Failed to download template:', error);
      addMessage('error', 'Failed to download template', 'Error');
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      addMessage('warning', 'Please select a file to import', 'Missing File');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/clearance-items/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImportResults(data);
        addMessage('success', `Import completed: ${data.successCount} items updated, ${data.errorCount} errors`, 'Import Results');
        fetchClearanceItems(); // Refresh the list
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to import clearance items', 'Error');
      }
    } catch (error) {
      console.error('Failed to import clearance items:', error);
      addMessage('error', 'Failed to import clearance items', 'Error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateForm = async () => {
    if (!formTitle || !formPeriod || selectedItems.length === 0) {
      addMessage('warning', 'Please fill in all required fields and select at least one item', 'Missing Information');
      return;
    }

    setIsProcessing(true);
    try {
      const formItemsData = selectedItems.map(item => ({
        itemId: item.itemId,
        stockId: item.stockId,
        quantity: item.quantity,
        condition: 'good', // Default condition, could be made configurable
        conditionNotes: null
      }));

      const response = await fetch('/api/clearance-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          period: formPeriod,
          items: formItemsData
        }),
      });

      if (response.ok) {
        setShowCreateFormModal(false);
        setFormTitle('');
        setFormDescription('');
        setFormPeriod('');
        setSelectedItems([]);
        setSelectAll(false);
        addMessage('success', 'Clearance form created successfully', 'Success');
        // Redirect to clearance forms page
        window.location.href = '/dashboard/clearance';
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to create clearance form', 'Error');
      }
    } catch (error) {
      console.error('Failed to create clearance form:', error);
      addMessage('error', 'Failed to create clearance form', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRevert = async () => {
    if (!revertReason.trim() || selectedItems.length === 0) {
      addMessage('warning', 'Please provide a reason and select at least one item', 'Missing Information');
      return;
    }

    setIsReverting(true);
    try {
      const response = await fetch('/api/items/bulk-revert-clearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: selectedItems,
          reason: revertReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowRevertModal(false);
        setRevertReason('');
        setSelectedItems([]);
        setSelectAll(false);
        addMessage('success', `${data.results.length} items reverted from clearance successfully`, 'Success');
        fetchClearanceItems(); // Refresh the list
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to revert items from clearance', 'Error');
      }
    } catch (error) {
      console.error('Failed to revert items from clearance:', error);
      addMessage('error', 'Failed to revert items from clearance', 'Error');
    } finally {
      setIsReverting(false);
    }
  };

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleSelectItem = (itemId: string, stockId: string, quantity: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, { itemId, stockId, quantity }]);
    } else {
      setSelectedItems(prev => prev.filter(item => !(item.itemId === itemId && item.stockId === stockId)));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allItems = clearanceItems.flatMap(item => 
        item.stock ? [{
          itemId: item.productCode,
          stockId: item.stock.id,
          quantity: item.stock.inClearance
        }] : []
      );
      setSelectedItems(allItems);
    } else {
      setSelectedItems([]);
    }
  };

  const getBoxById = (boxId: string | null) => {
    if (!boxId) return null;
    return boxes.find(box => box.id === boxId);
  };

  const filteredItems = clearanceItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeason = seasonFilter === 'all' || item.season === seasonFilter;
    const matchesBrand = brandFilter === 'all' || item.brandCode === brandFilter;
    const matchesDivision = divisionFilter === 'all' || item.productDivision === divisionFilter;
    const matchesCategory = categoryFilter === 'all' || item.productCategory === categoryFilter;
    const matchesPeriod = periodFilter === 'all' || item.period === periodFilter;
    
    return matchesSearch && matchesSeason && matchesBrand && matchesDivision && matchesCategory && matchesPeriod;
  });

  const userRole = session?.user?.role;
  const canManageClearance = userRole === 'storage-master' || userRole === 'storage-master-manager' || userRole === 'superadmin';

  const getPrimaryImage = (images: any[]) => {
    if (!images || images.length === 0) return null;
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  // Get unique values for filters
  const seasons = [...new Set(clearanceItems.map(item => item.season))];
  const brands = [...new Set(clearanceItems.map(item => item.brandCode))];
  const divisions = [...new Set(clearanceItems.map(item => item.productDivision))];
  const categories = [...new Set(clearanceItems.map(item => item.productCategory))];
  const periods = [...new Set(clearanceItems.map(item => item.period))];

  return (
    <div className="space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Items in Clearance</h1>
          <p className="text-gray-600 mt-1">Manage items available for clearance</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExport} variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button onClick={handleDownloadTemplate} variant="outline" className="flex items-center space-x-2">
            <FileDown className="h-4 w-4" />
            <span>Template</span>
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(season => (
              <SelectItem key={season} value={season}>{season}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(brand => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(division => (
              <SelectItem key={division} value={division}>{division}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {periods.map(period => (
              <SelectItem key={period} value={period}>{period}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {filteredItems.length > 0 && canManageClearance && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-items"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all-items">Select All ({filteredItems.length})</Label>
            {selectedItems.length > 0 && (
              <span className="text-sm text-gray-500">
                {selectedItems.length} selected
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowCreateFormModal(true)}
              disabled={selectedItems.length === 0}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Create Form with Selected</span>
            </Button>
            <Button
              onClick={() => setShowRevertModal(true)}
              disabled={selectedItems.length === 0}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Bulk Revert Selected</span>
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canManageClearance && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead>Item</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Clearance Stock</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.productCode}>
                  {canManageClearance && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.some(si => si.itemId === item.productCode && si.stockId === item.stock?.id)}
                        onCheckedChange={(checked) => {
                          if (item.stock) {
                            handleSelectItem(item.productCode, item.stock.id, item.stock.inClearance, checked as boolean);
                          }
                        }}
                        aria-label={`Select ${item.description}`}
                        disabled={!item.stock}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {item.images && item.images.length > 0 && (
                        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={getPrimaryImage(item.images)?.fileName ? `/uploads/${getPrimaryImage(item.images)?.fileName}` : '/placeholder.jpg'} 
                            alt={getPrimaryImage(item.images)?.altText || item.description}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <div className="text-sm font-medium">{item.productCode}</div>
                        <div className="font-normal truncate">{item.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="brand" value={item.brandCode} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="division" value={item.productDivision} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="category" value={item.productCategory} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="season" value={item.season} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <UniversalBadge type="period" value={item.period} />
                  </TableCell>
                  <TableCell>
                    {item.stock ? (
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{item.stock.inClearance}</span>
                        <UniversalBadge type="condition" value={item.stock.condition} />
                      </div>
                    ) : (
                      <span className="text-gray-500">No stock data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.location ? (
                      <div className="text-sm">
                        <div>{item.location.boxNumber}</div>
                        <div className="text-gray-500">{item.location.name}</div>
                      </div>
                    ) : item.stock?.boxId ? (
                      (() => {
                        const box = getBoxById(item.stock.boxId);
                        return box ? (
                          <div className="text-sm">
                            <div>{box.boxNumber}</div>
                            <div className="text-gray-500">{box.location.name}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Unknown Box</span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-500">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        {item.images && item.images.length > 0 && (
                          <DropdownMenuItem>
                            <Image className="mr-2 h-4 w-4" />
                            View Images
                          </DropdownMenuItem>
                        )}
                        
                        {canManageClearance && item.stock && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedItems([{ 
                                  itemId: item.productCode, 
                                  stockId: item.stock!.id, 
                                  quantity: item.stock!.inClearance 
                                }]);
                                setShowCreateFormModal(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Create Form with This Item
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedItems([{ 
                                  itemId: item.productCode, 
                                  stockId: item.stock!.id, 
                                  quantity: item.stock!.inClearance 
                                }]);
                                setShowRevertModal(true);
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Revert This Item
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items in clearance found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || seasonFilter !== 'all' || brandFilter !== 'all' || divisionFilter !== 'all' || categoryFilter !== 'all' || periodFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'There are no items currently in clearance'}
          </p>
        </div>
      )}

      {/* Modals */}

      {/* Create Form Modal */}
      <Dialog open={showCreateFormModal} onOpenChange={setShowCreateFormModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Clearance Form</DialogTitle>
            <DialogDescription>
              Create a new clearance form with selected items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-title">Form Title *</Label>
              <Input
                id="form-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter form title"
              />
            </div>
            
            <div>
              <Label htmlFor="form-description">Description</Label>
              <Textarea
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter form description"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="form-period">Period *</Label>
              <Input
                id="form-period"
                value={formPeriod}
                onChange={(e) => setFormPeriod(e.target.value)}
                placeholder="e.g., 2023-Q4, 2024-H1"
              />
            </div>
            
            <div>
              <Label>Selected Items ({selectedItems.length})</Label>
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No items selected</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedItems.map((item, index) => {
                      const clearanceItem = clearanceItems.find(i => i.productCode === item.itemId);
                      return (
                        <li key={index} className="text-sm flex justify-between">
                          <span>{clearanceItem?.description || item.itemId}</span>
                          <span className="text-gray-500">Qty: {item.quantity}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFormModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateForm}
              disabled={isProcessing || !formTitle || !formPeriod || selectedItems.length === 0}
            >
              {isProcessing ? 'Creating...' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Modal */}
      <Dialog open={showRevertModal} onOpenChange={setShowRevertModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revert Items from Clearance</DialogTitle>
            <DialogDescription>
              Move selected items back to storage from clearance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="revert-reason">Revert Reason *</Label>
              <Textarea
                id="revert-reason"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Enter reason for reverting these items from clearance"
                rows={3}
              />
            </div>
            
            <div>
              <Label>Selected Items ({selectedItems.length})</Label>
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No items selected</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedItems.map((item, index) => {
                      const clearanceItem = clearanceItems.find(i => i.productCode === item.itemId);
                      return (
                        <li key={index} className="text-sm flex justify-between">
                          <span>{clearanceItem?.description || item.itemId}</span>
                          <span className="text-gray-500">Qty: {item.quantity}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevertModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkRevert}
              disabled={isReverting || !revertReason.trim() || selectedItems.length === 0}
              variant="destructive"
            >
              {isReverting ? 'Reverting...' : 'Revert Items'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Clearance Items</DialogTitle>
            <DialogDescription>
              Upload an Excel file to update clearance quantities for items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
           <div>
            <Label htmlFor="import-file">Excel File *</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              The file should contain columns: Product Code, In Clearance
            </p>
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-700 font-medium">Required Fields:</p>
              <ul className="text-xs text-blue-700 list-disc pl-5 mt-1">
                <li>Product Code - The product code of the item</li>
                <li>In Clearance - The quantity to set for clearance (number)</li>
              </ul>
            </div>
            <div className="mt-3">
              <Button 
                onClick={handleDownloadTemplate}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <FileDown className="h-4 w-4" />
                <span>Download Template</span>
              </Button>
            </div>
          </div>
            
            {importResults && (
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Import Results</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Rows: {importResults.totalRows}</div>
                  <div>Success: {importResults.successCount}</div>
                  <div>Errors: {importResults.errorCount}</div>
                </div>
                
                {importResults.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-red-600">Errors</h4>
                    <div className="max-h-40 overflow-y-auto mt-1">
                      {importResults.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-600">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
              setImportResults(null);
            }}>
              {importResults ? 'Close' : 'Cancel'}
            </Button>
            {!importResults && (
              <Button 
                onClick={handleImport}
                disabled={isImporting || !importFile}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}