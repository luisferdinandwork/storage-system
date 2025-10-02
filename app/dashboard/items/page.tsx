// app/dashboard/items/page.tsx (Updated)

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, Trash2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddItemModal } from '@/components/items/add-item-modal';

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
  size: string;
  quantity: number;
  available: number;
  createdAt: string;
}

export default function ItemsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!removalReason.trim()) {
      alert('Please provide a reason for removal');
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
      } else {
        alert('Failed to remove item');
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert('Failed to remove item');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isAdmin = session?.user?.role === 'admin';

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'shoes':
        return 'bg-blue-100 text-blue-800';
      case 'apparel':
        return 'bg-green-100 text-green-800';
      case 'accessories':
        return 'bg-purple-100 text-purple-800';
      case 'equipment':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
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

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-primary-500 mr-2" />
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemovingItemId(item.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {item.description && (
                  <CardDescription>{item.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getCategoryColor(item.category)
                    )}>
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Size: {item.size}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Available</p>
                    <p className="text-xl font-semibold">{item.available}/{item.quantity}</p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    item.available > 0 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  )}>
                    {item.available > 0 ? "Available" : "Out of Stock"}
                  </div>
                </div>
              </CardContent>
              
              {removingItemId === item.id && (
                <div className="absolute inset-0 bg-white bg-opacity-95 p-4 rounded-lg flex flex-col justify-center">
                  <h3 className="font-medium mb-2">Reason for removal:</h3>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded mb-3"
                    rows={3}
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    placeholder="Enter reason for removing this item..."
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={!removalReason.trim()}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRemovingItemId(null);
                        setRemovalReason('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
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

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchItems}
      />
    </div>
  );
}