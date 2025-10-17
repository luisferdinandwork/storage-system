// components/items/column-selector.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Columns, RotateCcw } from 'lucide-react';

interface Column {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
}

export function ColumnSelector({
  isOpen,
  onClose,
  columns,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
}: ColumnSelectorProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Table Columns</DialogTitle>
          <DialogDescription>
            Select which columns to display in the table
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onChange={() => onToggleColumn(column.id)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor={column.id} className="text-sm font-medium">
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onResetColumns}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}