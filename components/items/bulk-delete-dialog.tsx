// components/items/bulk-delete-dialog.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemsCount: number;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedItemsCount,
  onConfirm,
  isDeleting,
}: BulkDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Delete Items</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedItemsCount} items? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}