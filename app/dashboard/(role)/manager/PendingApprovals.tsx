// app/dashboard/(role)/manager/PendingApprovals.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, XCircle, User, Clock, AlertCircle } from 'lucide-react';
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
  requestedAt: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  user: {
    [x: string]: string;
    name: string;
    email: string;
  };
  items: BorrowRequestItem[];
}

interface PendingApprovalsProps {
  departmentUserIds: string[];
}

export default function PendingApprovals({ departmentUserIds }: PendingApprovalsProps) {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/borrow-requests?status=pending_manager');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }
      
      const data = await response.json();
      
      // Filter to only include requests from users in the department
      const filteredRequests = data.filter((req: BorrowRequest) => 
        departmentUserIds.includes(req.user.id)
      );
      
      setRequests(filteredRequests);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setError('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Borrow requests requiring your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Loading pending approvals...</p>
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
            <FileText className="h-5 w-5 text-amber-500" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Borrow requests requiring your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={fetchPendingApprovals} variant="outline">
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
          <FileText className="h-5 w-5 text-amber-500" />
          Pending Approvals
        </CardTitle>
        <CardDescription>
          Borrow requests requiring your approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">Request #{request.id}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <User className="h-4 w-4 mr-1" />
                      <span>{request.user.name}</span>
                    </div>
                  </div>
                  <Badge variant="outline">Pending Manager</Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{request.reason}</p>
                
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Items Requested:</h4>
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
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Requested: {format(new Date(request.requestedAt), 'MMM dd, yyyy')}</span>
                </div>
                
                {/* Action */}
                {/* <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/borrow-requests/${request.id}`}>View Details</Link>
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                    <Link href={`/borrow-requests/${request.id}/approve`}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Link>
                  </Button>
                  <Button size="sm" variant="destructive" asChild>
                    <Link href={`/borrow-requests/${request.id}/reject`}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Link>
                  </Button>
                </div> */}
              </div>
            ))}
            
            <div className="pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/requests/pending">View All Pending Requests</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              All borrow requests have been processed. Great job staying on top of approvals!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}