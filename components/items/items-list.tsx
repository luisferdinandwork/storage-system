// components/items/items-list.tsx (example parent component)
'use client';

import { useState, useEffect } from 'react';
import { ItemsTable } from '@/components/items/items-table';
import { useExportItems } from '@/hooks/use-export-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Filter, Plus } from 'lucide-react';
import { Item, Column } from '@/components/items/items-table';

// Define your columns
const defaultColumns: Column[] = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'brandCode', label: 'Brand', defaultVisible: true },
  { id: 'productDivision', label: 'Division', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'unit', label: 'Unit', defaultVisible: true },
  { id: 'stock', label: 'Stock', defaultVisible: true },
  { id: 'condition', label: 'Condition', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'totalStock', label: 'Total Stock', defaultVisible: true },
  { id: 'createdBy', label: 'Created By', defaultVisible: true },
  { id: 'approvedBy', label: 'Approved By', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

export function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(
    defaultColumns.filter(col => col.defaultVisible).map(col => col.id)
  );
  const { exportItems, isExporting } = useExportItems();

  // Fetch items from API
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      // Handle error (e.g., show toast notification)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Filter items based on search query
  const filteredItems = items.filter(item =>
    item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brandCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle export
  const handleExportItems = async (itemIds: string[]) => {
    await exportItems(itemIds, 'csv');
  };

  // Handle item actions
  const handleEditItem = (item: Item) => {
    // Handle edit item
    console.log('Edit item:', item);
  };

  const handleDeleteItem = (itemId: string) => {
    // Handle delete item
    console.log('Delete item:', itemId);
  };

  const handleApproveItem = (itemId: string) => {
    // Handle approve item
    console.log('Approve item:', itemId);
  };

  const handleRejectItem = (itemId: string) => {
    // Handle reject item
    console.log('Reject item:', itemId);
  };

  const handleViewImage = (image: any) => {
    // Handle view image
    console.log('View image:', image);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground">
            Manage and track your inventory items
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Items Inventory</CardTitle>
              <CardDescription>
                A list of all items in your inventory
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  className="pl-8 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ItemsTable
            items={filteredItems}
            columns={defaultColumns}
            visibleColumns={visibleColumns}
            isLoading={isLoading}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onViewImage={handleViewImage}
            onApproveItem={handleApproveItem}
            onRejectItem={handleRejectItem}
            onExportItems={handleExportItems}
            canEditItem={true}
            canDeleteItem={true}
            canApproveItem={true}
            canExportItems={true}
            showActions={true}
            isExporting={isExporting}
          />
        </CardContent>
      </Card>
    </div>
  );
}