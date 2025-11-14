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
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Edit, 
  Image, 
  Trash2, 
  Eye, 
  Package, 
  Download, 
  FileDown, 
  ChevronLeft, 
  ChevronRight, 
  Archive,
  Calendar,
  Clock
} from 'lucide-react';
import { UniversalBadge } from '@/components/ui/universal-badge';
import { EditItemModal } from '@/components/items/edit-item-modal';
import React from 'react';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem  } from '../ui/select';

interface ItemImage {
  id: string;
  itemId: string; // This is now the productCode
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  altText: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface Box {
  id: string;
  boxNumber: string;
  description: string | null;
  location: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface Location {
  id: string;
  name: string;
  description: string | null;
}

interface ItemStock {
  pending: number;
  id: string;
  itemId: string; // This is now the productCode
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
  boxId: string | null;
  condition: string;
  conditionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  productCode: string; // This is now the primary key
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
  approvedByUser?: {
    id: string;
    name: string;
  };
  images: ItemImage[];
  stock: ItemStock | null;
  box?: Box | null; // Added box object
  location?: Location | null; // Added location object
  totalStock?: number; // Added total stock
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
  onDeleteItem?: (productCode: string) => void; // Changed to productCode
  onViewImage?: (image: ItemImage) => void;
  onApproveItem?: (productCode: string) => void; // Changed to productCode
  onRejectItem?: (productCode: string) => void; // Changed to productCode
  onExportItems?: (productCodes: string[]) => void; // Changed to productCodes
  onClearanceItems?: (productCodes: string[]) => void; // Changed to productCodes
  canEditItem?: boolean;
  canDeleteItem?: boolean;
  canApproveItem?: boolean;
  canExportItems?: boolean;
  canClearanceItems?: boolean;
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
  // New props for selected items
  selectedItems?: string[]; // These are now productCodes
  onSelectionChange?: (selectedItems: string[]) => void; // These are now productCodes
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
  onClearanceItems,
  canEditItem = false,
  canDeleteItem = false,
  canApproveItem = false,
  canExportItems = false,
  canClearanceItems = false,
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
  selectedItems: propSelectedItems = [],
  onSelectionChange,
}: ItemsTableProps) {
  const { data: session } = useSession();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedImage, setSelectedImage] = useState<ItemImage | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  
  // Use internal state if no prop is provided
  const [internalSelectedItems, setInternalSelectedItems] = useState<string[]>([]);
  const selectedItems = propSelectedItems || internalSelectedItems;
  const setSelectedItems = onSelectionChange || setInternalSelectedItems;

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

  const handleRemoveItem = (productCode: string) => {
    setRemovingItemId(productCode);
  };

  const confirmRemoveItem = () => {
    if (removingItemId && onDeleteItem) {
      onDeleteItem(removingItemId);
      setRemovingItemId(null);
    }
  };

  const handleApproveItem = (productCode: string) => {
    if (onApproveItem) {
      onApproveItem(productCode);
    }
  };

  const handleRejectItem = (productCode: string) => {
    if (onRejectItem) {
      onRejectItem(productCode);
    }
  };

  const handleSelectItem = (productCode: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, productCode]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== productCode));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.productCode));
    } else {
      setSelectedItems([]);
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
          <TableCell key={`item-${item.productCode}`}>
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
          <TableCell key={`brandCode-${item.productCode}`}>
            <UniversalBadge type="brand" value={item.brandCode} />
          </TableCell>
        );
      case 'productDivision':
        return (
          <TableCell key={`productDivision-${item.productCode}`}>
            <UniversalBadge type="division" value={item.productDivision} />
          </TableCell>
        );
      case 'category':
        return (
          <TableCell key={`category-${item.productCode}`}>
            <UniversalBadge type="category" value={item.productCategory} />
          </TableCell>
        );
      case 'season':
        return (
          <TableCell key={`season-${item.productCode}`}>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
              <Calendar className="mr-1 h-3 w-3" />
              {item.season}
            </Badge>
          </TableCell>
        );
      case 'period':
        return (
          <TableCell key={`period-${item.productCode}`}>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200">
              <Clock className="mr-1 h-3 w-3" />
              {item.period}
            </Badge>
          </TableCell>
        );
      case 'unit':
        return (
          <TableCell key={`unit-${item.productCode}`}>
            <UniversalBadge type="unit" value={item.unitOfMeasure} />
          </TableCell>
        );
      case 'stock':
        return (
          <TableCell key={`stock-${item.productCode}`}>
            {item.stock ? (
              <TooltipProvider>
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-wrap gap-1">
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
                </div>
              </TooltipProvider>
            ) : (
              <div className="text-gray-500">No stock data</div>
            )}
          </TableCell>
        );
      case 'totalStock':
        return (
          <TableCell key={`totalStock-${item.productCode}`}>
            <div className="flex justify-center">
              <div className="font-medium">
                {item.totalStock || 0}
              </div>
            </div>
          </TableCell>
        );
      case 'createdBy':
        return (
          <TableCell key={`createdBy-${item.productCode}`}>
            <div className="text-sm">
              {item.createdByUser?.name || 'Unknown'}
            </div>
          </TableCell>
        );
      case 'approvedBy':
        return (
          <TableCell key={`approvedBy-${item.productCode}`}>
            <div className="text-sm">
              {item.approvedByUser?.name || item.approvedBy ? 'Unknown' : 'Not approved'}
            </div>
          </TableCell>
        );
      case 'status':
        return (
          <TableCell key={`status-${item.productCode}`}>
            <UniversalBadge type="status" value={item.status} />
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key={`actions-${item.productCode}`} className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-normal text-gray-500">Item Actions</DropdownMenuLabel>
                
                {item.images.length > 0 && (
                  <DropdownMenuItem 
                    onClick={() => handleViewImage(getPrimaryImage(item.images))}
                    className="cursor-pointer"
                  >
                    <Image className="mr-2 h-4 w-4" />
                    View Images
                  </DropdownMenuItem>
                )}
                
                {canEditItem && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleEditItem(item)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </>
                )}
                
                {canApproveItem && item.status === 'pending_approval' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleApproveItem(item.productCode)}
                      className="cursor-pointer text-green-600"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRejectItem(item.productCode)}
                      className="cursor-pointer text-red-600"
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
                        if (onExportItems) {
                          onExportItems([item.productCode]);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuItem>
                  </>
                )}
                
                {canClearanceItems && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (onClearanceItems) {
                          onClearanceItems([item.productCode]);
                        }
                      }}
                      className="cursor-pointer text-orange-600"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Move to Clearance
                    </DropdownMenuItem>
                  </>
                )}
                
                {customActions && customActions(item)}
                
                {canDeleteItem && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemoveItem(item.productCode)}
                      className="cursor-pointer text-red-600"
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
      <div className="border rounded-md overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead key="checkbox" className="w-12">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length && items.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </TableHead>
              {visibleColumns
                .filter(col => col !== 'actions')
                .map(columnId => {
                  const column = columns.find(col => col.id === columnId);
                  return column ? <TableHead key={columnId} className="font-medium text-gray-900">{column.label}</TableHead> : null;
                })}
              {showActions && visibleColumns.includes('actions') && (
                <TableHead key="actions" className="text-right font-medium text-gray-900">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.productCode} className="hover:bg-gray-50">
                <TableCell key={`checkbox-${item.productCode}`}>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.productCode)}
                    onChange={(e) => handleSelectItem(item.productCode, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </TableCell>
                {visibleColumns
                  .filter(col => col !== 'actions')
                  .map(columnId => (
                    <React.Fragment key={`${item.productCode}-${columnId}`}>
                      {renderTableCell(item, columnId)}
                    </React.Fragment>
                  ))}
                {showActions && visibleColumns.includes('actions') && (
                  <React.Fragment key={`${item.productCode}-actions`}>
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
            className="h-8 w-8 p-0 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {generatePageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-sm text-gray-500">...</span>
              ) : (
                <Button
                  variant={activeCurrentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(Number(page))}
                  className="h-8 w-8 p-0 rounded-full"
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
            className="h-8 w-8 p-0 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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