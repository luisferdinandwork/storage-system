// components/items/items-table.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoreHorizontal, Edit, Image, Trash2, Eye, Package, Download, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { UniversalBadge } from '@/components/ui/universal-badge';
import { EditItemModal } from '@/components/items/edit-item-modal';
import { ExportButton } from '@/components/items/export-button';
import React from 'react';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem  } from '../ui/select';

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

interface ItemStock {
  pending: number;
  id: string;
  itemId: string;
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
  location: string | null;
  condition: string;
  conditionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  productCode: string;
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  totalStock: number;
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
  approvedByUser?: {
    id: string;
    name: string;
  };
  images: ItemImage[];
  stock: ItemStock | null;
}

export interface Column {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface ItemsTableProps {
  items: Item[];
  columns: Column[];
  visibleColumns: string[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onEditItem?: (item: Item) => void;
  onDeleteItem?: (itemId: string) => void;
  onViewImage?: (image: ItemImage) => void;
  onApproveItem?: (itemId: string) => void;
  onRejectItem?: (itemId: string) => void;
  onExportItems?: (itemIds: string[]) => void;
  canEditItem?: boolean;
  canDeleteItem?: boolean;
  canApproveItem?: boolean;
  canExportItems?: boolean;
  showActions?: boolean;
  customActions?: (item: Item) => React.ReactNode;
  renderCustomCell?: (item: Item, columnId: string) => React.ReactNode;
  isExporting?: boolean;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems?: number;
}

export function ItemsTable({
  items,
  columns,
  visibleColumns,
  isLoading = false,
  emptyMessage = 'No items found',
  emptyDescription = 'Try adjusting your search or filters',
  onEditItem,
  onDeleteItem,
  onViewImage,
  onApproveItem,
  onRejectItem,
  onExportItems,
  canEditItem = false,
  canDeleteItem = false,
  canApproveItem = false,
  canExportItems = false,
  showActions = true,
  customActions,
  renderCustomCell,
  isExporting = false,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  totalItems = items.length,
}: ItemsTableProps) {
  const { data: session } = useSession();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedImage, setSelectedImage] = useState<ItemImage | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Internal state for pagination if not controlled externally
  const [internalCurrentPage, setInternalCurrentPage] = useState(currentPage);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState(itemsPerPage);
  
  // Use external props if provided, otherwise use internal state
  const isControlledPagination = onPageChange !== undefined;
  const activeCurrentPage = isControlledPagination ? currentPage : internalCurrentPage;
  const activeItemsPerPage = isControlledPagination ? itemsPerPage : internalItemsPerPage;
  
  // Calculate total pages if not provided
  const calculatedTotalPages = Math.ceil(totalItems / activeItemsPerPage);
  const activeTotalPages = totalPages || calculatedTotalPages;
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > activeTotalPages) return;
    
    if (isControlledPagination) {
      onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    if (isControlledPagination && onItemsPerPageChange) {
      onItemsPerPageChange(newItemsPerPage);
    } else {
      setInternalItemsPerPage(newItemsPerPage);
      // Reset to first page when changing items per page
      if (isControlledPagination) {
        onPageChange?.(1);
      } else {
        setInternalCurrentPage(1);
      }
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowEditModal(true);
    if (onEditItem) {
      onEditItem(item);
    }
  };

  const handleEditItemSuccess = () => {
    setShowEditModal(false);
    setEditingItem(null);
    // Call the onEditItem callback here to trigger a refresh
    if (onEditItem && editingItem) {
      onEditItem(editingItem);
    }
  };

  const handleViewImage = (image: ItemImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
    if (onViewImage) {
      onViewImage(image);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setRemovingItemId(itemId);
  };

  const confirmRemoveItem = () => {
    if (removingItemId && onDeleteItem) {
      onDeleteItem(removingItemId);
      setRemovingItemId(null);
    }
  };

  const handleApproveItem = (itemId: string) => {
    if (onApproveItem) {
      onApproveItem(itemId);
    }
  };

  const handleRejectItem = (itemId: string) => {
    if (onRejectItem) {
      onRejectItem(itemId);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(items.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleExportSelected = (itemIds: string[]) => {
    if (onExportItems) {
      onExportItems(itemIds);
    }
  };

  const handleExportAll = () => {
    if (onExportItems) {
      onExportItems([]); // Empty array means export all
    }
  };

  const getPrimaryImage = (images: ItemImage[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };
  
  const generatePageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (activeTotalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than or equal to max visible pages
      for (let i = 1; i <= activeTotalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of page range
      let start = Math.max(2, activeCurrentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(activeTotalPages - 1, start + maxVisiblePages - 3);
      
      // Adjust start if end is too close to the end
      if (end === activeTotalPages - 1) {
        start = Math.max(2, end - maxVisiblePages + 3);
      }
      
      // Add ellipsis if needed
      if (start > 2) {
        pageNumbers.push('...');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis if needed
      if (end < activeTotalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(activeTotalPages);
    }
    
    return pageNumbers;
  };

  const renderTableCell = (item: Item, columnId: string) => {
    // If a custom render function is provided, use it
    if (renderCustomCell) {
      const customCell = renderCustomCell(item, columnId);
      if (customCell) return customCell;
    }

    switch (columnId) {
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
                <div className="font-medium truncate">{item.productCode}</div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="text-sm text-gray-600 truncate">{item.description}</div>
                </div>
              </div>
            </div>
          </TableCell>
        );
      case 'brandCode':
        return (
          <TableCell key={`brandCode-${item.id}`}>
            <UniversalBadge type="brand" value={item.brandCode} />
          </TableCell>
        );
      case 'productDivision':
        return (
          <TableCell key={`productDivision-${item.id}`}>
            <UniversalBadge type="division" value={item.productDivision} />
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={`category-${item.id}`}>
            <UniversalBadge type="category" value={item.productCategory} />
          </TableCell>
        );
      case 'unit':
        return (
          <TableCell key={`unit-${item.id}`}>
            <UniversalBadge type="unit" value={item.unitOfMeasure} />
          </TableCell>
        );
      case 'stock':
        return (
          <TableCell key={`stock-${item.id}`}>
            {item.stock ? (
              <TooltipProvider>
                <div className="flex items-center space-x-2">
                  {/* Calculate available stock (pending + inStorage) */}
                  {(item.stock.pending > 0 || item.stock.inStorage > 0) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                          <span>{item.stock.pending + item.stock.inStorage}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total: {item.stock.pending + item.stock.inStorage} items</p>
                        {item.stock.pending > 0 && <p>Pending: {item.stock.pending} items</p>}
                        {item.stock.inStorage > 0 && <p>In Storage: {item.stock.inStorage} items</p>}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Show borrowed stock only if all stock is borrowed (no pending or inStorage) */}
                  {item.stock.onBorrow > 0 && item.stock.pending === 0 && item.stock.inStorage === 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                          <span>{item.stock.onBorrow}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>On Borrow: {item.stock.onBorrow} items</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            ) : (
              <div className="text-gray-500">No stock data</div>
            )}
          </TableCell>
        );
      case 'condition':
        return (
          <TableCell key={`condition-${item.id}`}>
            {item.stock ? (
              <div className="flex flex-col space-y-1">
                <UniversalBadge type="condition" value={item.stock.condition} />
                {item.stock.conditionNotes && (
                  <span className="text-xs text-gray-500 truncate max-w-[200px]">
                    {item.stock.conditionNotes}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-gray-500">No condition data</div>
            )}
          </TableCell>
        );
      case 'location':
        return (
          <TableCell key={`location-${item.id}`}>
            {item.stock && item.stock.location ? (
              <UniversalBadge type="location" value={item.stock.location} />
            ) : (
              <div className="text-gray-500">No location</div>
            )}
          </TableCell>
        );
      case 'totalStock':
        return (
          <TableCell key={`totalStock-${item.id}`}>
            <div className="flex justify-center">
              <div className="font-medium">
                {item.stock ? 
                  (item.stock.pending > 0 || item.stock.inStorage > 0 ? 
                    item.stock.pending + item.stock.inStorage : 0) : 
                  0}
              </div>
            </div>
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
      case 'approvedBy':
        return (
          <TableCell key={`approvedBy-${item.id}`}>
            <div className="text-sm">
              {item.approvedByUser?.name || item.approvedBy ? 'Unknown' : 'Not approved'}
            </div>
          </TableCell>
        );
      case 'status':
        return (
          <TableCell key={`status-${item.id}`}>
            <UniversalBadge type="status" value={item.status} />
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
                
                {canApproveItem && item.status === 'pending_approval' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleApproveItem(item.id)}
                      className="text-green-600"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRejectItem(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                
                {canExportItems && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedItems([item.id]);
                        onExportItems?.([item.id]); // Fixed with optional chaining
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuItem>
                  </>
                )}
                
                {customActions && customActions(item)}
                
                {canDeleteItem && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemoveItem(item.id)}
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{emptyMessage}</h3>
        <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>
      </div>
    );
  };

  return (
    <>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead key="checkbox" className="w-12">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4"
                />
              </TableHead>
              {visibleColumns
                .filter(col => col !== 'actions')
                .map(columnId => {
                  const column = columns.find(col => col.id === columnId);
                  return column ? <TableHead key={columnId}>{column.label}</TableHead> : null;
                })}
              {showActions && visibleColumns.includes('actions') && (
                <TableHead key="actions" className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell key={`checkbox-${item.id}`}>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                    className="h-4 w-4"
                  />
                </TableCell>
                {visibleColumns
                  .filter(col => col !== 'actions')
                  .map(columnId => (
                    <React.Fragment key={`${item.id}-${columnId}`}>
                      {renderTableCell(item, columnId)}
                    </React.Fragment>
                  ))}
                {showActions && visibleColumns.includes('actions') && (
                  <React.Fragment key={`${item.id}-actions`}>
                    {renderTableCell(item, 'actions')}
                  </React.Fragment>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Showing {((activeCurrentPage - 1) * activeItemsPerPage) + 1} to {Math.min(activeCurrentPage * activeItemsPerPage, totalItems)} of {totalItems} results
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Items per page:</span>
            <Select
              value={activeItemsPerPage.toString()}
              onValueChange={(value) => handleItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue placeholder={activeItemsPerPage.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(activeCurrentPage - 1)}
            disabled={activeCurrentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {generatePageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-sm">...</span>
              ) : (
                <Button
                  variant={activeCurrentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(Number(page))}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(activeCurrentPage + 1)}
            disabled={activeCurrentPage === activeTotalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Export Button */}
      <div className="mt-4 flex justify-end">
        <ExportButton
          selectedItems={selectedItems}
          totalItems={totalItems}
          onExportSelected={handleExportSelected}
          onExportAll={handleExportAll}
          canExportItems={canExportItems}
          isExporting={isExporting}
        />
      </div>

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
              onClick={confirmRemoveItem}
            >
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}