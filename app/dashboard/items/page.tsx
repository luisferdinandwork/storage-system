// File: app/items/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Trash2, Filter, MoreHorizontal, Edit, Hand } from 'lucide-react';
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
import { MessageContainer} from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';

interface ItemSize {
  id: string;
  size: string;
  quantity: number;
  available: number;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
  addedBy: string;
  addedByUser?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  sizes: ItemSize[];
}

export default function ItemsPage() {
  const { data: session } = useSession();
  const { messages, addMessage, dismissMessage } = useMessages();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

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

  const handleBorrowItem = (item: Item) => {
    setSelectedItem(item);
    setShowBorrowModal(true);
  };

  const handleAddItemSuccess = () => {
    setShowAddModal(false);
    fetchItems();
    addMessage('success', 'Item added successfully', 'Success');
  };

  const handleEditItemSuccess = () => {
    setShowEditModal(false);
    fetchItems();
    addMessage('success', 'Item updated successfully', 'Success');
  };

  const handleBorrowSuccess = () => {
    setShowBorrowModal(false);
    fetchItems();
    addMessage('success', 'Borrow request submitted successfully', 'Success');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isAdmin = session?.user?.role === 'admin';
  const isUser = session?.user?.role === 'user' || session?.user?.role === 'manager';

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'shoes':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Shoes</Badge>;
      case 'apparel':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Apparel</Badge>;
      case 'accessories':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Accessories</Badge>;
      case 'equipment':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Equipment</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getTotalQuantity = (sizes: ItemSize[]) => {
    return sizes.reduce((total, size) => total + size.quantity, 0);
  };

  const getTotalAvailable = (sizes: ItemSize[]) => {
    return sizes.reduce((total, size) => total + size.available, 0);
  };

  const getStockStatus = (sizes: ItemSize[]) => {
    const totalAvailable = getTotalAvailable(sizes);
    const totalQuantity = getTotalQuantity(sizes);
    
    if (totalAvailable === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (totalAvailable < totalQuantity * 0.2) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800">Low Stock</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 w-fit">In Stock</Badge>;
    }
  };

  const hasAvailableSizes = (sizes: ItemSize[]) => {
    return sizes.some(size => size.available > 0);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Message Container */}
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Items</h1>
        {isAdmin && (
          <Button 
            onClick={() => setShowAddModal(true)} 
            className="bg-primary-500 hover:bg-primary-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
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
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="shoes">Shoes</option>
            <option value="apparel">Apparel</option>
            <option value="accessories">Accessories</option>
            <option value="equipment">Equipment</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs" title={item.description}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(item.category)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.sizes.map((size) => (
                        <Badge key={size.id} variant="outline" className="bg-gray-100 text-gray-800">
                          {size.size}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="font-medium">
                        {getTotalAvailable(item.sizes)}/{getTotalQuantity(item.sizes)}
                      </div>
                      {getStockStatus(item.sizes)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.addedByUser?.name || 'Unknown'}
                    </div>
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        
                        {isUser && hasAvailableSizes(item.sizes) && (
                          <DropdownMenuItem
                            onClick={() => handleBorrowItem(item)}
                            className="text-blue-600"
                          >
                            <Hand className="mr-2 h-4 w-4" />
                            Borrow
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
                </TableRow>
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
            {searchTerm || categoryFilter !== 'all' ? 'Try adjusting your search or filters' : 'Get started by adding a new item'}
          </p>
        </div>
      )}

      {/* Removal Confirmation Modal */}
      {removingItemId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Delete Item</h3>
            <p className="text-sm text-gray-600 mb-4">Reason for deletion:</p>
            <textarea
              className="w-full p-2 border border-gray-300 rounded mb-4"
              rows={3}
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="Enter reason for deleting this item..."
            />
            <div className="flex justify-end space-x-2">
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
                onClick={() => handleRemoveItem(removingItemId)}
                disabled={!removalReason.trim()}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddItemSuccess}
      />

      {/* Borrow Item Modal */}
      <BorrowItemModal
        isOpen={showBorrowModal}
        onClose={() => setShowBorrowModal(false)}
        onSuccess={handleBorrowSuccess}
        item={selectedItem}
      />

      <EditItemModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditItemSuccess}
        item={editingItem}
      />
    </div>
  );
}