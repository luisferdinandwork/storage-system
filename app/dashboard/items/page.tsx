'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Filter, MoreHorizontal, Edit, Image, Columns, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddItemModal } from '@/components/items/add-item-modal';
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
  location: string | null;
  unitOfMeasure: string;
  condition: string;
  conditionNotes: string | null;
  status: 'pending_approval' | 'approved' | 'available' | 'borrowed' | 'in_clearance';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdByUser?: {
    id: string;
    name: string;
  };
  images: ItemImage[];
}

// Define all possible columns
const ALL_COLUMNS = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'productCode', label: 'Product Code', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'unit', label: 'Unit', defaultVisible: true },
  { id: 'condition', label: 'Condition', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'inventory', label: 'Inventory', defaultVisible: true },
  { id: 'vendor', label: 'Vendor', defaultVisible: false },
  { id: 'createdBy', label: 'Created By', defaultVisible: false },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

export default function ItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedImage, setSelectedImage] = useState<ItemImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
  );
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [inlineAddRowIndex, setInlineAddRowIndex] = useState<number>(-1);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
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

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRemovingItemId(null);
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

  const handleAddItemSuccess = () => {
    setShowAddModal(false);
    setShowInlineAdd(false);
    setInlineAddRowIndex(-1);
    fetchItems();
    addMessage('success', 'Item added successfully', 'Success');
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

  const handleInlineAdd = (index: number) => {
    setInlineAddRowIndex(index);
    setShowInlineAdd(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.productCategory === categoryFilter;
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
    const matchesUnit = unitFilter === 'all' || item.unitOfMeasure === unitFilter;
    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesUnit && matchesCondition && matchesStatus;
  });

  const userRole = session?.user?.role;
  const isSuperAdmin = userRole === 'superadmin';
  const isItemMaster = userRole === 'item-master';
  const isStorageMaster = userRole === 'storage-master';
  const isStorageManager = userRole === 'storage-master-manager';
  const isManager = userRole === 'manager';
  const isUser = userRole === 'user';
  
  const canAddItem = isSuperAdmin || isItemMaster;
  const canEditItem = isSuperAdmin || isItemMaster;
  const canDeleteItem = isSuperAdmin;
  const canViewItems = true; // All roles can view items

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

  const getLocationBadge = (location: string | null) => {
    if (!location) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Not Assigned</Badge>;
    }
    
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
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'available':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Available</Badge>;
      case 'borrowed':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Borrowed</Badge>;
      case 'in_clearance':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">In Clearance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleResetColumns = () => {
    setVisibleColumns(
      ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
    );
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
              checked={false}
              onChange={() => {}}
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
                    src={getPrimaryImage(item.images).fileName ? `/uploads/${getPrimaryImage(item.images).fileName}` : '/placeholder.jpg'} 
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
                
                {canEditItem && (
                  <DropdownMenuItem
                    onClick={() => handleEditItem(item)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                
                {canDeleteItem && (
                  <>
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
        <h1 className="text-3xl font-bold text-gray-900">Items</h1>
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
            onClick={() => window.open('/api/items/export')}
          >
            Export
          </Button>
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
                <option value="">Not Assigned</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="in_clearance">In Clearance</option>
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
              {showInlineAdd && inlineAddRowIndex === filteredItems.length && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="p-0">
                    <InlineAddItem
                      onSuccess={handleAddItemSuccess}
                      onCancel={() => {
                        setShowInlineAdd(false);
                        setInlineAddRowIndex(-1);
                      }}
                    />
                  </TableCell>
                </TableRow>
              )}
              
              {canAddItem && !showInlineAdd && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleInlineAdd(filteredItems.length)}
                      className="text-primary-600"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              
              {filteredItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <TableRow>
                    {visibleColumns
                      .filter(col => col !== 'actions')
                      .map(columnId => (
                        <React.Fragment key={`${item.id}-${columnId}`}>
                          {renderTableCell(item, columnId)}
                        </React.Fragment>
                      ))}
                    {visibleColumns.includes('actions') && (
                      <React.Fragment key={`${item.id}-actions`}>
                        {renderTableCell(item, 'actions')}
                      </React.Fragment>
                    )}
                  </TableRow>
                  {showInlineAdd && inlineAddRowIndex === index && (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="p-0">
                        <InlineAddItem
                          onSuccess={handleAddItemSuccess}
                          onCancel={() => {
                            setShowInlineAdd(false);
                            setInlineAddRowIndex(-1);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || categoryFilter !== 'all' || locationFilter !== 'all' || unitFilter !== 'all' || conditionFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Get started by adding a new item'}
          </p>
        </div>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddItemSuccess}
      />

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
                src={selectedImage.fileName ? `/uploads/${selectedImage.fileName}` : '/placeholder.jpg'} 
                alt={selectedImage.altText || 'Item image'}
                className="max-w-full max-h-96 object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={removingItemId !== null} onOpenChange={() => setRemovingItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemovingItemId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removingItemId && handleRemoveItem(removingItemId)}
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
        onResetColumns={handleResetColumns}
      />
    </div>
  );
}