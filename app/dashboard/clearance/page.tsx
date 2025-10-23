// app/dashboard/clearance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Archive, 
  Search, 
  RefreshCw, 
  Eye, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ClearanceDetailsModal } from '@/components/items/clearance-details-modal';
import Link from 'next/link';

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
  id: string;
  itemId: string;
  pending: number;
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

interface ItemClearance {
  id: string;
  itemId: string;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  clearedAt: string | null;
  metadata: any;
}

interface Item {
  id: string;
  productCode: string;
  description: string;
  brandCode: string;
  productDivision: string;
  productCategory: string;
  period: string;
  season: string;
  unitOfMeasure: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdByUser?: {
    id: string;
    name: string;
  };
  stock: ItemStock | null;
  clearances: ItemClearance[];
}

interface ClearancePageProps {
  searchParams: {
    page?: string;
    limit?: string;
  };
}

export default function ClearancePage({ searchParams }: ClearancePageProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.page || '1'));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.limit || '10'));
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const userRole = session?.user?.role;
  const isStorageMaster = userRole === 'storage-master';
  const isSuperAdmin = userRole === 'superadmin';
  const isStorageManager = userRole === 'storage-manager';
  const canManageClearance = isStorageMaster || isSuperAdmin || isStorageManager;

  useEffect(() => {
    fetchClearanceItems();
  }, [currentPage, itemsPerPage]);

  const fetchClearanceItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/items/clearance?page=${currentPage}&limit=${itemsPerPage}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } else {
        console.error('Failed to fetch clearance items');
      }
    } catch (error) {
      console.error('Error fetching clearance items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    fetchClearanceItems();
  };

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const filteredItems = items.filter(item => {
    return (
      item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return <Badge variant="default">Excellent</Badge>;
      case 'good':
        return <Badge variant="secondary">Good</Badge>;
      case 'fair':
        return <Badge variant="outline">Fair</Badge>;
      case 'poor':
        return <Badge variant="destructive">Poor</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Clearance</h1>
          <p className="text-muted-foreground">
            Manage items that have been moved to clearance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canManageClearance && (
            <Link href="/dashboard/items">
              <Button>
                <Archive className="mr-2 h-4 w-4" />
                Manage Items
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Clearance Items
          </CardTitle>
          <CardDescription>
            View and manage items that are currently in clearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">No clearance items found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There are currently no items in clearance.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Clearance Quantity</TableHead>
                          <TableHead>Latest Clearance</TableHead>
                          <TableHead>Status</TableHead>
                          {canManageClearance && <TableHead className="w-24">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.productCode}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.brandCode}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.productCategory}</Badge>
                            </TableCell>
                            <TableCell>
                              {item.stock ? getConditionBadge(item.stock.condition) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {item.stock ? item.stock.inClearance : 0}
                            </TableCell>
                            <TableCell>
                              {item.clearances && item.clearances.length > 0 ? (
                                <div>
                                  <div className="text-sm">
                                    {format(new Date(item.clearances[0].requestedAt), 'MMM dd, yyyy')}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.clearances[0].reason}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No clearance records</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.clearances && item.clearances.length > 0
                                ? getStatusBadge(item.clearances[0].status)
                                : 'N/A'}
                            </TableCell>
                            {canManageClearance && (
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleViewDetails(item)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredItems.length} of {totalItems} items
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Clearance Details Modal */}
      <ClearanceDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        item={selectedItem}
      />
    </div>
  );
}