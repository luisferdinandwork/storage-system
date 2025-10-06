// lib/types.ts

export interface ItemSize {
  id: string;
  size: string;
  quantity: number;
  available: number;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  sizes: ItemSize[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  department?: {
    id: string;
    name: string;
  };
}

export interface BorrowRequest {
  id: string;
  item: Item;
  itemSize: ItemSize;
  user: User;
  quantity: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'returned';
  managerApproved: boolean | null;
  adminApproved: boolean | null;
  managerApprovedBy?: {
    id: string;
    name: string;
  };
  adminApprovedBy?: {
    id: string;
    name: string;
  };
  managerApprovedAt?: string;
  adminApprovedAt?: string;
  rejectionReason?: string;
  returnedAt?: string;
}