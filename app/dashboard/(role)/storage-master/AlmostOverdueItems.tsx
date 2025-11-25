// app/dashboard/(role)/storage-master/AlmostOverdueItems.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, User, Package } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface BorrowRequestItem {
  id: string;
  quantity: number;
  item: {
    productCode: string;
    description: string;
  };
}

interface BorrowRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  user: {
    name: string;
    email: string;
  };
  items: BorrowRequestItem[];
}

export default function AlmostOverdueItems() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlmostOverdueItems();
  }, []);

  const fetchAlmostOverdueItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/borrow-requests?status=active');
      
      if (!response.ok) {
        throw new Error('Failed to fetch active borrow requests');
      }
      
      const data = await response.json();
      
      // Filter for items that are almost overdue (within 3 days)
      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);
      
      const almostOverdue = data.filter((request: BorrowRequest) => {
        const endDate = new Date(request.endDate);
        return endDate <= threeDaysFromNow;
      });
      
      setRequests(almostOverdue);
    } catch (err) {
      console.error('Error fetching almost overdue items:', err);
      setError('Failed to load almost overdue items');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Almost Overdue Items
          </CardTitle>
          <CardDescription>
            Active borrow requests ending within 3 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Loading almost overdue items...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Almost Overdue Items
          </CardTitle>
          <CardDescription>
            Active borrow requests ending within 3 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={fetchAlmostOverdueItems} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Almost Overdue Items
        </CardTitle>
        <CardDescription>
          Active borrow requests ending within 3 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => {
              const daysLeft = Math.ceil(
                (new Date(request.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              
              return (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">Request #{request.id}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <User className="h-4 w-4 mr-1" />
                        <span>{request.user.name}</span>
                      </div>
                    </div>
                    <Badge variant={daysLeft <= 1 ? "destructive" : "outline"}>
                      {daysLeft <= 0 ? "Overdue" : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{request.reason}</p>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Items Borrowed:</h4>
                    <div className="flex flex-wrap gap-2">
                      {request.items.map((item) => (
                        <div key={item.id} className="flex items-center bg-gray-100 rounded-md px-2 py-1">
                          <span className="text-sm font-medium">{item.item.productCode}</span>
                          <span className="mx-1 text-gray-400">•</span>
                          <span className="text-sm text-gray-600">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Ends: {format(new Date(request.endDate), 'MMM dd, yyyy')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/borrow-requests/${request.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/requests/active">View All Active Requests</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Almost Overdue Items</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              All active borrow requests are in good standing. No items need immediate attention.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}