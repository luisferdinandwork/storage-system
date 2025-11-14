'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UniversalBadge } from '@/components/ui/universal-badge';
import { Package, MapPin, Calendar, Ruler } from 'lucide-react';

interface Box {
  id: string;
  boxNumber: string;
  description: string;
  location: {
    id: string;
    name: string;
  };
}

interface Item {
  id?: string;
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
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdByUser?: {
    id: string;
    name: string;
  };
  stock?: {
    id: string;
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    boxId: string | null;
    box?: Box;
    condition: string;
    conditionNotes: string | null;
  };
  stockRecords?: Array<{
    id: string;
    itemId: string;
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    boxId: string | null;
    box?: Box;
    location?: {
      id: string;
      name: string;
    };
    condition: string;
    conditionNotes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  images: {
    id: string;
    itemId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    altText: string | null;
    isPrimary: boolean;
    createdAt: string;
  }[];
}

interface ItemDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

export function ItemDetailsModal({ open, onOpenChange, item }: ItemDetailsModalProps) {
  if (!item) return null;

  const primaryImage = item.images?.find(img => img.isPrimary) || item.images?.[0];
  const firstStockRecord = item.stockRecords?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Item Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image */}
            {primaryImage && (
              <div className="md:col-span-1">
                <img 
                  src={`/uploads/${primaryImage.fileName}`}
                  alt={primaryImage.altText || 'Item image'}
                  className="w-full h-64 object-cover rounded-lg border"
                />
                {item.images && item.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {item.images.slice(1, 5).map((image, index) => (
                      <img 
                        key={index}
                        src={`/uploads/${image.fileName}`}
                        alt={image.altText || 'Item image'}
                        className="w-full h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product Info */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">{item.description}</h3>
                <p className="text-sm text-gray-500 font-mono">{item.productCode}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <UniversalBadge type="brand" value={item.brandCode} />
                <UniversalBadge type="division" value={item.productDivision} />
                <UniversalBadge type="category" value={item.productCategory} />
                <UniversalBadge type="status" value={item.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Total Stock:</span>
                  <span className="font-semibold">{item.totalStock}</span>
                  <UniversalBadge type="unit" value={item.unitOfMeasure} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">{item.period} • {item.season}</span>
                </div>
                {firstStockRecord && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Condition:</span>
                      <UniversalBadge type="condition" value={firstStockRecord.condition} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Location:</span>
                      {firstStockRecord.box?.boxNumber && firstStockRecord.box?.location?.name ? (
                        <span className="font-medium">
                          {firstStockRecord.box.boxNumber} - {firstStockRecord.box.location.name}
                        </span>
                      ) : firstStockRecord.location?.name ? (
                        <span className="font-medium">{firstStockRecord.location.name}</span>
                      ) : (
                        <span className="text-gray-400">Not Assigned</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {firstStockRecord?.conditionNotes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Condition Notes</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{firstStockRecord.conditionNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock Summary */}
          {item.stock && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Stock Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded text-center border">
                  <p className="text-2xl font-bold text-gray-900">{item.stock.pending}</p>
                  <p className="text-xs text-gray-500 mt-1">Pending</p>
                </div>
                <div className="bg-white p-3 rounded text-center border">
                  <p className="text-2xl font-bold text-green-600">{item.stock.inStorage}</p>
                  <p className="text-xs text-gray-500 mt-1">In Storage</p>
                </div>
                <div className="bg-white p-3 rounded text-center border">
                  <p className="text-2xl font-bold text-blue-600">{item.stock.onBorrow}</p>
                  <p className="text-xs text-gray-500 mt-1">On Borrow</p>
                </div>
                <div className="bg-white p-3 rounded text-center border">
                  <p className="text-2xl font-bold text-orange-600">{item.stock.inClearance}</p>
                  <p className="text-xs text-gray-500 mt-1">In Clearance</p>
                </div>
                <div className="bg-white p-3 rounded text-center border">
                  <p className="text-2xl font-bold text-purple-600">{item.stock.seeded}</p>
                  <p className="text-xs text-gray-500 mt-1">Seeded</p>
                </div>
              </div>
            </div>
          )}

          {/* Stock by Location */}
          {item.stockRecords && item.stockRecords.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Stock by Location</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Box</TableHead>
                      <TableHead className="text-right font-semibold">Pending</TableHead>
                      <TableHead className="text-right font-semibold">In Storage</TableHead>
                      <TableHead className="text-right font-semibold">On Borrow</TableHead>
                      <TableHead className="text-right font-semibold">In Clearance</TableHead>
                      <TableHead className="text-right font-semibold">Seeded</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.stockRecords.map((record, index) => {
                      const total = record.pending + record.inStorage + record.onBorrow + record.inClearance + record.seeded;
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {record.box?.location?.name || record.location?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {record.box?.boxNumber || 'Not Assigned'}
                          </TableCell>
                          <TableCell className="text-right">{record.pending}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{record.inStorage}</TableCell>
                          <TableCell className="text-right text-blue-600">{record.onBorrow}</TableCell>
                          <TableCell className="text-right text-orange-600">{record.inClearance}</TableCell>
                          <TableCell className="text-right text-purple-600">{record.seeded}</TableCell>
                          <TableCell className="text-right font-bold">{total}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Metadata */}
          {item.createdAt && (
            <div className="text-xs text-gray-500 pt-4 border-t">
              Created on {new Date(item.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}