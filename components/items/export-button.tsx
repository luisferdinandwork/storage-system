// components/items/export-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileDown } from 'lucide-react';

interface ExportButtonProps {
  selectedItems: string[];
  totalItems: number;
  onExportSelected: (itemIds: string[]) => void;
  onExportAll: () => void;
  canExportItems?: boolean;
  isExporting?: boolean;
}

export function ExportButton({
  selectedItems,
  totalItems,
  onExportSelected,
  onExportAll,
  canExportItems = false,
  isExporting = false,
}: ExportButtonProps) {
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportSelected = () => {
    if (selectedItems.length > 0) {
      onExportSelected(selectedItems);
      setShowExportModal(false);
    }
  };

  const handleExportAll = () => {
    onExportAll();
    setShowExportModal(false);
  };

  if (!canExportItems) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowExportModal(true)}
        disabled={selectedItems.length === 0 || isExporting}
        variant="outline"
        className="ml-auto"
      >
        <FileDown className="mr-2 h-4 w-4" />
        Export {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
      </Button>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Items</DialogTitle>
            <DialogDescription>
              Choose which items to export and the format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              {selectedItems.length > 0 ? (
                <p>Selected {selectedItems.length} items for export</p>
              ) : (
                <p>No items selected</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportSelected}
              disabled={selectedItems.length === 0 || isExporting}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export Selected
            </Button>
            <Button
              onClick={handleExportAll}
              variant="outline"
              disabled={isExporting}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}