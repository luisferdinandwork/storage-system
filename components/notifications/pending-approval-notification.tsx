import { useState, useEffect } from 'react';

interface ItemRequest {
  id: string;
  itemId: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  item: {
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
    images: Array<{
      id: string;
      itemId: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      altText: string | null;
      isPrimary: boolean;
      createdAt: string;
    }>;
  };
  requestedByUser: {
    id: string;
    name: string;
    role: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
  };
}

interface BorrowRequest {
  endDate: string;
  id: string;
  status: 'pending_manager' | 'pending_storage' | 'pending_extension' | 'approved' | 'rejected' | 'active' | 'complete' | 'seeded' | 'reverted';
}

/**
 * Hook to get pending item requests count (for Warehousing menu)
 * Shows count of items pending approval
 */
export function usePendingItemRequestsCount(userRole: string): number {
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Check if user is warehousing staff
  const canViewPending = 
    userRole === 'storage-master' || 
    userRole === 'storage-manager' || 
    userRole === 'superadmin';

  // Fetch pending item requests count
  const fetchPendingCount = async () => {
    if (!canViewPending) return;

    try {
      const response = await fetch('/api/item-requests?status=pending');
      if (response.ok) {
        const data: ItemRequest[] = await response.json();
        // Filter for pending status
        const pendingItems = data.filter(req => req.status === 'pending');
        setPendingCount(pendingItems.length);
      }
    } catch (error) {
      console.error('Failed to fetch pending item requests count:', error);
    }
  };

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!canViewPending) return;

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [canViewPending]);

  return pendingCount;
}

/**
 * Hook to get pending borrow requests count (for Pending List menu)
 * Shows count of borrow requests pending approval based on user role
 */
export function usePendingBorrowRequestsCount(userRole: string): number {
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Check if user can view pending borrow requests
  const canViewPending = 
    userRole === 'manager' || 
    userRole === 'storage-master' || 
    userRole === 'storage-manager' || 
    userRole === 'superadmin';

  // Fetch pending borrow requests count
  const fetchPendingCount = async () => {
    if (!canViewPending) return;

    try {
      const response = await fetch('/api/borrow-requests');
      if (response.ok) {
        const data: BorrowRequest[] = await response.json();
        
        // Filter based on user role
        const filtered = data.filter(req => {
          if (userRole === 'manager') {
            return req.status === 'pending_manager';
          } else if (userRole === 'storage-master' || userRole === 'storage-manager') {
            return req.status === 'pending_storage' || req.status === 'pending_extension';
          } else if (userRole === 'superadmin') {
            return req.status === 'pending_manager' || req.status === 'pending_storage' || req.status === 'pending_extension';
          }
          return false;
        });
        
        setPendingCount(filtered.length);
      }
    } catch (error) {
      console.error('Failed to fetch pending borrow requests count:', error);
    }
  };

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!canViewPending) return;

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [canViewPending]);

  return pendingCount;
}

/**
 * Hook to get overdue borrow requests count (for Active Lending menu)
 * Shows count of borrow requests that are overdue
 */
export function useOverdueBorrowRequestsCount(userRole: string): number {
  const [overdueCount, setOverdueCount] = useState<number>(0);

  // Check if user can view active lending requests
  const canViewPending = 
    userRole === 'storage-master' || 
    userRole === 'storage-manager' || 
    userRole === 'superadmin';

  // Fetch overdue borrow requests count
  const fetchOverdueCount = async () => {
    if (!canViewPending) return;

    try {
      const response = await fetch('/api/borrow-requests');
      if (response.ok) {
        const data: BorrowRequest[] = await response.json();
        
        // Filter for active requests that are overdue
        const overdue = data.filter(req => {
          const isActive = req.status === 'active';
          const endDate = new Date(req.endDate || '');
          const today = new Date();
          const isOverdue = endDate < today;
          
          return isActive && isOverdue;
        });
        
        setOverdueCount(overdue.length);
      }
    } catch (error) {
      console.error('Failed to fetch overdue borrow requests count:', error);
    }
  };

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!canViewPending) return;

    fetchOverdueCount();
    const interval = setInterval(fetchOverdueCount, 30000);

    return () => clearInterval(interval);
  }, [canViewPending]);

  return overdueCount;
}