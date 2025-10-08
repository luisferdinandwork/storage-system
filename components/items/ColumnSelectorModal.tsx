import React from 'react';
import { Eye, EyeOff, Columns } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ColumnOption {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnOption[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
}

export default function ColumnSelectorModal({
  isOpen,
  onClose,
  columns,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
}: ColumnSelectorModalProps) {
  // Filter out columns that shouldn't be toggleable
  const toggleableColumns = columns.filter(
    col => col.id !== 'checkbox' && col.id !== 'actions'
  );

  const handleSelectAll = () => {
    toggleableColumns.forEach(col => {
      if (!visibleColumns.includes(col.id)) {
        onToggleColumn(col.id);
      }
    });
  };

  const handleDeselectAll = () => {
    toggleableColumns.forEach(col => {
      if (visibleColumns.includes(col.id)) {
        onToggleColumn(col.id);
      }
    });
  };

  const visibleCount = toggleableColumns.filter(col => 
    visibleColumns.includes(col.id)
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Manage Columns
          </DialogTitle>
          <DialogDescription>
            Select which columns you want to display in the table. Changes are applied immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{visibleCount}</span> of{' '}
              <span className="font-medium">{toggleableColumns.length}</span> columns visible
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              <Eye className="mr-2 h-4 w-4" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="flex-1"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Hide All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetColumns}
              className="flex-1"
            >
              Reset
            </Button>
          </div>

          {/* Column List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {toggleableColumns.map((column) => {
              const isVisible = visibleColumns.includes(column.id);
              
              return (
                <div
                  key={column.id}
                  className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onToggleColumn(column.id)}
                >
                  <Checkbox
                    id={column.id}
                    checked={isVisible}
                    onCheckedChange={() => onToggleColumn(column.id)}
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor={column.id}
                    className="flex-1 text-sm font-medium cursor-pointer select-none"
                  >
                    {column.label}
                  </label>
                  {isVisible ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Fixed Columns Notice */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              <span className="font-medium">Note:</span> Checkbox and Actions columns are always visible.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}