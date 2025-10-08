// app/dashboard/archived-items/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Trash2, Filter, MoreHorizontal, Edit, Hand, Image, MapPin, Eye, EyeOff, Columns, Archive, ArchiveIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddItemModal } from '@/components/items/add-item-modal';
import { BorrowItemModal } from '@/components/items/borrow-item-modal';
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
import { Badge } from '@/components/ui/badge';
import { EditItemModal } from '@/components/items/edit-item-modal';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InlineAddItem } from '@/components/items/inline-add-item';
import { ArchiveItemModal } from '@/components/items/archive-item-modal';
import { BulkArchiveModal } from '@/components/items/bulk-archive-modal';
import React from 'react';
import ColumnSelectorModal from '@/components/items/ColumnSelectorModal';

interface ItemImage {
  id: string;
  itemId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  altText: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface Item {
  id: string;
  productCode: string;
  description: string;
  brandCode: string;
  productGroup: string;
  productDivision: string;
  productCategory: string;
  inventory: number;
  vendor: string;
  period: string;
  season: string;
  gender: string;
  mould: string;
  tier: string;
  silo: string;
  location: string;
  unitOfMeasure: string;
  condition: string;
  conditionNotes: string | null;
  status: 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: string;
    name: string;
  };
  images: ItemImage[];
}

// Define all possible columns
const ALL_COLUMNS = [
  { id: 'checkbox', label: '', defaultVisible: true },
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'productCode', label: 'Product Code', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'unit', label: 'Unit', defaultVisible: true },
  { id: 'condition', label: 'Condition', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'inventory', label: 'Inventory', defaultVisible: true },
  { id: 'vendor', label: 'Vendor', defaultVisible: false },
  { id: 'createdBy', label: 'Created By', defaultVisible: false },
  { id: 'status', label: 'Status', defaultVisible: false },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

export default function ArchivedItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedImage, setSelectedImage] = useState<ItemImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
  );
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [unarchivingItemId, setUnarchivingItemId] = useState<string | null>(null);
  const [unarchiveReason, setUnarchiveReason] = useState('');
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkUnarchiveModal, setShowBulkUnarchiveModal] = useState(false);
  const [bulkUnarchiveReason, setBulkUnarchiveReason] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items?status=archived');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        addMessage('error', 'Failed to fetch archived items', 'Error');
      }
    } catch (error) {
      console.error('Failed to fetch archived items:', error);
      addMessage('error', 'Failed to fetch archived items', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!removalReason.trim()) {
      addMessage('warning', 'Please provide a reason for removal', 'Missing Information');
      return;
    }
    
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: removalReason }),
      });

      if (response.ok) {
        setRemovingItemId(null);
        setRemovalReason('');
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

  const handleEditItemSuccess = () => {
    setShowEditModal(false);
    fetchItems();
    addMessage('success', 'Item updated successfully', 'Success');
  };

  const handleViewImage = (image: ItemImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
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

  const handleUnarchiveItem = (item: Item) => {
    setUnarchivingItemId(item.id);
    setShowUnarchiveModal(true);
  };

  const handleUnarchiveSuccess = () => {
    setShowUnarchiveModal(false);
    setUnarchivingItemId(null);
    setUnarchiveReason('');
    fetchItems();
    addMessage('success', 'Item unarchived successfully', 'Success');
  };

  const handleUnarchive = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!unarchivingItemId || !unarchiveReason.trim()) {
      addMessage('warning', 'Please provide a reason for unarchiving', 'Missing Information');
      return;
    }
    
    setIsUnarchiving(true);
    
    try {
      const response = await fetch(`/api/items/${unarchivingItemId}/unarchive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: unarchiveReason.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        handleUnarchiveSuccess();
        addMessage('success', data.message || 'Item unarchived successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to unarchive item', 'Error');
      }
    } catch (error) {
      console.error('Failed to unarchive item:', error);
      addMessage('error', 'Failed to unarchive item', 'Error');
    } finally {
      setIsUnarchiving(false);
    }
  };

  const handleBulkUnarchive = () => {
    if (selectedItems.length === 0) {
      addMessage('warning', 'Please select at least one item to unarchive', 'No Items Selected');
      return;
    }
    setShowBulkUnarchiveModal(true);
  };

  const handleBulkUnarchiveSuccess = () => {
    setShowBulkUnarchiveModal(false);
    setBulkUnarchiveReason('');
    setSelectedItems([]);
    fetchItems();
    addMessage('success', 'Items unarchived successfully', 'Success');
  };

  const handleBulkUnarchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0 || !bulkUnarchiveReason.trim()) {
      addMessage('warning', 'Please select items and provide a reason for unarchiving', 'Missing Information');
      return;
    }
    
    setIsUnarchiving(true);
    
    try {
      const response = await fetch('/api/items/bulk-unarchive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemIds: selectedItems,
          reason: bulkUnarchiveReason.trim() 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        handleBulkUnarchiveSuccess();
        addMessage('success', data.message || 'Items unarchived successfully', 'Success');
      } else {
        const error = await response.json();
        addMessage('error', error.error || 'Failed to unarchive items', 'Error');
      }
    } catch (error) {
      console.error('Failed to bulk unarchive items:', error);
      addMessage('error', 'Failed to bulk unarchive items', 'Error');
    } finally {
      setIsUnarchiving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.productCategory === categoryFilter;
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
    const matchesUnit = unitFilter === 'all' || item.unitOfMeasure === unitFilter;
    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
    return matchesSearch && matchesCategory && matchesLocation && matchesUnit && matchesCondition;
  });

  const isAdmin = session?.user?.role === 'admin';

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'LST':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Lifestyle</Badge>;
      case 'PRF':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Performance</Badge>;
      case 'SLR':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Slider</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getLocationBadge = (location: string) => {
    switch (location) {
      case 'Storage 1':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Storage 1</Badge>;
      case 'Storage 2':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800">Storage 2</Badge>;
      case 'Storage 3':
        return <Badge variant="outline" className="bg-pink-100 text-pink-800">Storage 3</Badge>;
      default:
        return <Badge variant="outline">{location}</Badge>;
    }
  };

  const getUnitBadge = (unit: string) => {
    switch (unit) {
      case 'PCS':
        return <Badge variant="outline" className="bg-cyan-100 text-cyan-800">PCS</Badge>;
      case 'PRS':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">PRS</Badge>;
      default:
        return <Badge variant="outline">{unit}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'good':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Good</Badge>;
      case 'fair':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Fair</Badge>;
      case 'poor':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Poor</Badge>;
      default:
        return <Badge variant="outline">{condition}</Badge>;
    }
  };

  const getStockStatus = (inventory: number) => {
    if (inventory === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (inventory < 5) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800">Low Stock</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 w-fit">In Stock</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case 'archived':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const getPrimaryImage = (images: ItemImage[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  const renderTableCell = (item: Item, columnId: string) => {
    switch (columnId) {
      case 'checkbox':
        return (
          <TableCell key={`checkbox-${item.id}`}>
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={selectedItems.includes(item.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedItems(prev => [...prev, item.id]);
                } else {
                  setSelectedItems(prev => prev.filter(id => id !== item.id));
                }
              }}
            />
          </TableCell>
        );
      case 'item':
        return (
          <TableCell key={`item-${item.id}`}>
            <div className="flex items-center space-x-3">
              {item.images.length > 0 && (
                <div 
                  className="w-12 h-12 rounded-md overflow-hidden cursor-pointer flex-shrink-0"
                  onClick={() => handleViewImage(getPrimaryImage(item.images))}
                >
                  <img 
                    src={getPrimaryImage(item.images).fileName ? `/archived/${getPrimaryImage(item.images).fileName}` : '/placeholder.jpg'} 
                    alt={getPrimaryImage(item.images).altText || item.description}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col space-y-1 min-w-0">
                <div className="font-medium truncate">{item.description}</div>
                <div className="text-sm text-gray-500 truncate max-w-xs" title={item.brandCode}>
                  {item.brandCode} / {item.productGroup}
                </div>
              </div>
            </div>
          </TableCell>
        );
      case 'productCode':
        return (
          <TableCell key={`productCode-${item.id}`}>
            <div className="font-mono text-sm">{item.productCode}</div>
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={`category-${item.id}`}>
            {getCategoryBadge(item.productCategory)}
          </TableCell>
        );
      case 'unit':
        return (
          <TableCell key={`unit-${item.id}`}>
            {getUnitBadge(item.unitOfMeasure)}
          </TableCell>
        );
      case 'condition':
        return (
          <TableCell key={`condition-${item.id}`}>
            {getConditionBadge(item.condition)}
          </TableCell>
        );
      case 'location':
        return (
          <TableCell key={`location-${item.id}`}>
            {getLocationBadge(item.location)}
          </TableCell>
        );
      case 'inventory':
        return (
          <TableCell key={`inventory-${item.id}`}>
            <div className="flex flex-col space-y-1">
              <div className="font-medium">{item.inventory}</div>
              {getStockStatus(item.inventory)}
            </div>
          </TableCell>
        );
      case 'vendor':
        return (
          <TableCell key={`vendor-${item.id}`}>
            <div className="text-sm">{item.vendor}</div>
          </TableCell>
        );
      case 'createdBy':
        return (
          <TableCell key={`createdBy-${item.id}`}>
            <div className="text-sm">
              {item.createdByUser?.name || 'Unknown'}
            </div>
          </TableCell>
        );
      case 'status':
        return (
          <TableCell key={`status-${item.id}`}>
            {getStatusBadge(item.status)}
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key={`actions-${item.id}`} className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>View Details</DropdownMenuItem>
                
                {item.images.length > 0 && (
                  <DropdownMenuItem onClick={() => handleViewImage(getPrimaryImage(item.images))}>
                    <Image className="mr-2 h-4 w-4" />
                    View Images
                  </DropdownMenuItem>
                )}
                
                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleEditItem(item)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUnarchiveItem(item)}
                      className="text-green-600"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Unarchive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setRemovingItemId(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Archived Items</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setShowColumnSelector(true)}
          >
            <Columns className="mr-2 h-4 w-4" />
            Columns
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('/api/items/export?type=archived')}
          >
            Export Archived
          </Button>
          <Button 
            variant="outline"
            onClick={handleBulkUnarchive}
            disabled={selectedItems.length === 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Bulk Unarchive ({selectedItems.length})
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search archived items..."
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="LST">Lifestyle</option>
                <option value="PRF">Performance</option>
                <option value="SLR">Slider</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Locations</option>
                <option value="Storage 1">Storage 1</option>
                <option value="Storage 2">Storage 2</option>
                <option value="Storage 3">Storage 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
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
                onChange={(e) => setConditionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
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
                {visibleColumns
                  .filter(col => col !== 'actions')
                  .map(columnId => {
                    const column = ALL_COLUMNS.find(col => col.id === columnId);
                    return column ? <TableHead key={columnId}>{column.label}</TableHead> : null;
                  })}
                {visibleColumns.includes('actions') && (
                  <TableHead key="actions" className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  {visibleColumns.map(columnId => renderTableCell(item, columnId))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Archive className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No archived items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || categoryFilter !== 'all' || locationFilter !== 'all' || unitFilter !== 'all' || conditionFilter !== 'all' ? 'Try adjusting your search or filters' : 'There are no archived items at the moment'}
          </p>
        </div>
      )}

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditItemSuccess}
        item={editingItem}
      />

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Item Image</DialogTitle>
            <DialogDescription>
              {selectedImage?.altText || 'Item image'}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img 
                src={selectedImage.fileName ? `/archived/${selectedImage.fileName}` : '/placeholder.jpg'} 
                alt={selectedImage.altText || 'Item image'}
                className="max-w-full max-h-96 object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unarchive Item Modal */}
      <Dialog open={showUnarchiveModal} onOpenChange={setShowUnarchiveModal}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Unarchive Item</DialogTitle>
            <DialogDescription>
              This will restore the item to active status. The item will be available for borrowing again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="font-medium">{items.find(item => item.id === unarchivingItemId)?.description}</div>
            <div className="text-sm text-gray-600">Product Code: {items.find(item => item.id === unarchivingItemId)?.productCode}</div>
            <div className="text-sm text-gray-600">Inventory: {items.find(item => item.id === unarchivingItemId)?.inventory}</div>
          </div>

          <form onSubmit={handleUnarchive} className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for unarchiving
              </label>
              <textarea
                id="reason"
                value={unarchiveReason}
                onChange={(e) => setUnarchiveReason(e.target.value)}
                placeholder="Enter reason for unarchiving this item..."
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUnarchiveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUnarchiving}>
                {isUnarchiving ? 'Unarchiving...' : 'Unarchive'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Unarchive Modal */}
      <Dialog open={showBulkUnarchiveModal} onOpenChange={setShowBulkUnarchiveModal}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Bulk Unarchive Items</DialogTitle>
            <DialogDescription>
              This will restore {selectedItems.length} items to active status. The items will be available for borrowing again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium">Items to unarchive: {selectedItems.length}</p>
          </div>

          <form onSubmit={handleBulkUnarchiveSubmit} className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for unarchiving
              </label>
              <textarea
                id="reason"
                value={bulkUnarchiveReason}
                onChange={(e) => setBulkUnarchiveReason(e.target.value)}
                placeholder="Enter reason for unarchiving these items..."
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBulkUnarchiveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUnarchiving}>
                {isUnarchiving ? 'Unarchiving...' : 'Unarchive Items'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={removingItemId !== null} onOpenChange={() => {
        setRemovingItemId(null);
        setRemovalReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a reason for deleting this item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for deletion *
              </label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Enter reason for deletion..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemovingItemId(null);
                setRemovalReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removingItemId && handleRemoveItem(removingItemId)}
              disabled={!removalReason.trim()}
            >
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColumnSelectorModal
        isOpen={showColumnSelector}
        onClose={() => setShowColumnSelector(false)}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumnVisibility}
        onResetColumns={() => {
          setVisibleColumns(
            ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
          );
        }}
      />
    </div>
  );
}