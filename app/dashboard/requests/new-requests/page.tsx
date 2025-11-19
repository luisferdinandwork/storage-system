'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageContainer } from '@/components/ui/message';
import { useMessages } from '@/hooks/use-messages';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Plus, Search, X, Package, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalBadge } from '@/components/ui/universal-badge';

interface Item {
  productCode: string; // Changed from id to productCode
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  totalStock: number;
  unitOfMeasure: string;
  stock: {
    id: string;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    boxId: string | null; // Changed from location to boxId
    condition: string;
  } | null;
  images: {
    id: string;
    itemId: string; // This should be productCode
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    altText: string | null;
    isPrimary: boolean;
    createdAt: string;
  }[];
}

interface RequestedItem {
  itemId: string; // This will be the productCode
  quantity: number;
  item: Item;
}

export default function NewBorrowRequestPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { messages, addMessage, dismissMessage } = useMessages();
  
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [requestedItems, setRequestedItems] = useState<RequestedItem[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showItemSearch, setShowItemSearch] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = items.filter(item => 
        item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
  }, [searchTerm, items]);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items?status=approved');
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

  const handleAddItem = (item: Item) => {
    // Check if item is already in the request
    if (requestedItems.find(reqItem => reqItem.itemId === item.productCode)) { // Changed from item.id to item.productCode
      addMessage('warning', 'Item already added to request', 'Duplicate Item');
      return;
    }

    // Check if there's sufficient stock
    if (!item.stock || item.stock.inStorage <= 0) {
      addMessage('error', 'Item is out of stock', 'Insufficient Stock');
      return;
    }

    // Add item with default quantity of 1
    setRequestedItems([...requestedItems, {
      itemId: item.productCode, // Changed from item.id to item.productCode
      quantity: 1,
      item
    }]);
    
    setSearchTerm('');
    setShowItemSearch(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setRequestedItems(requestedItems.filter(item => item.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const item = requestedItems.find(reqItem => reqItem.itemId === itemId);
    if (!item) return;
    
    // Ensure quantity doesn't exceed available stock
    const maxQuantity = item.item.stock?.inStorage || 0;
    const newQuantity = Math.min(Math.max(1, quantity), maxQuantity);
    
    setRequestedItems(requestedItems.map(reqItem => 
      reqItem.itemId === itemId 
        ? { ...reqItem, quantity: newQuantity }
        : reqItem
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      addMessage('error', 'Please provide a reason for the request', 'Missing Information');
      return;
    }
    
    if (requestedItems.length === 0) {
      addMessage('error', 'Please add at least one item to your request', 'Missing Items');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/borrow-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: requestedItems.map(({ itemId, quantity }) => ({ itemId, quantity })),
          reason: reason.trim(),
        }),
      });
      
      if (response.ok) {
        addMessage('success', 'Borrow request submitted successfully', 'Success');
        router.push('/dashboard/requests/my-requests');
      } else {
        const errorData = await response.json();
        addMessage('error', errorData.error || 'Failed to submit request', 'Error');
      }
    } catch (error) {
      console.error('Failed to submit borrow request:', error);
      addMessage('error', 'Failed to submit request', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrimaryImage = (images: any[]) => {
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage || images[0];
  };

  return (
    <div className="space-y-6">
      <MessageContainer messages={messages} onDismiss={dismissMessage} />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Lending Request</h1>
        <p className="text-muted-foreground">
          Submit a request to borrow items for a 14-day period.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lending Request Details</CardTitle>
          <CardDescription>
            Fill in the details for your borrow request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="flex items-center h-10 px-3 py-2 rounded-md border border-gray-200 bg-gray-50">
                  <Clock className="mr-2 h-4 w-4 text-gray-500" />
                  {endDate ? format(endDate, "PPP") : "Select start date"}
                </div>
                <p className="text-xs text-gray-500">Automatically set to 14 days from start date</p>
              </div>
            </div> */}
            
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you need to borrow these items..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Item Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Requested Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowItemSearch(!showItemSearch)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              
              {/* Item Search */}
              {showItemSearch && (
                <div className="border rounded-md p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search items by product code or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {filteredItems.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredItems.map((item) => (
                        <div
                          key={item.productCode} // Changed from item.id to item.productCode
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            {item.images && item.images.length > 0 && (
                              <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                                <img
                                  src={getPrimaryImage(item.images).fileName ? `/uploads/${getPrimaryImage(item.images).fileName}` : '/placeholder.jpg'}
                                  alt={getPrimaryImage(item.images).altText || item.description}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{item.productCode}</div>
                              <div className="text-sm text-gray-500">{item.description}</div>
                              <div className="text-xs text-gray-400">
                                Available: {item.stock?.inStorage || 0} {item.unitOfMeasure}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddItem(item)}
                            disabled={!item.stock || item.stock.inStorage <= 0}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchTerm && filteredItems.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No items found matching your search.
                    </div>
                  )}
                </div>
              )}
              
              {/* Selected Items */}
              {requestedItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Items</Label>
                  <div className="space-y-2">
                    {requestedItems.map((requestedItem) => (
                      <div
                        key={requestedItem.itemId} // This is the productCode
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          {requestedItem.item.images && requestedItem.item.images.length > 0 && (
                            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={getPrimaryImage(requestedItem.item.images).fileName ? `/uploads/${getPrimaryImage(requestedItem.item.images).fileName}` : '/placeholder.jpg'}
                                alt={getPrimaryImage(requestedItem.item.images).altText || requestedItem.item.description}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{requestedItem.item.productCode}</div>
                            <div className="text-sm text-gray-500">{requestedItem.item.description}</div>
                            <div className="text-xs text-gray-400">
                              Available: {requestedItem.item.stock?.inStorage || 0} {requestedItem.item.unitOfMeasure}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(requestedItem.itemId, requestedItem.quantity - 1)}
                              disabled={requestedItem.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{requestedItem.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(requestedItem.itemId, requestedItem.quantity + 1)}
                              disabled={requestedItem.quantity >= (requestedItem.item.stock?.inStorage || 0)}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(requestedItem.itemId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {requestedItems.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-md">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add items to your borrow request.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || requestedItems.length === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}