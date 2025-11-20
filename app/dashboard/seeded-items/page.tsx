'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Package, MapPin, Box, Search, ArrowLeft, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

interface SeededItem {
  stock: {
    id: string;
    itemId: string;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
    condition: string;
    conditionNotes: string;
    updatedAt: string;
  };
  item: {
    productCode: string;
    description: string;
    brandCode: string;
    period: string;
    season: string;
    unitOfMeasure: string;
  };
  box: {
    id: string;
    boxNumber: string;
    description: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
}

interface BoxData {
  id: string;
  boxNumber: string;
  description: string;
  location: {
    id: string;
    name: string;
  } | null;
}

interface ReturnItem {
  stockId: string;
  boxId: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

export default function SeededItemsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [seededItems, setSeededItems] = useState<SeededItem[]>([]);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedBox, setSelectedBox] = useState<string>('all');
  
  // Dialog states
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [deleteNotes, setDeleteNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch boxes and locations data
  const fetchBoxesAndLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/boxes');
      if (!response.ok) throw new Error('Failed to fetch boxes');
      const boxesData = await response.json();
      setBoxes(boxesData);
      
      // Extract unique locations from boxes data
      const uniqueLocations = Array.from(
        new Map(
          boxesData
            .filter((box: BoxData) => box.location !== null)
            .map((box: BoxData) => [box.location!.id, box.location])
        ).values()
      ) as {id: string, name: string}[];
      
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Failed to fetch boxes and locations:', error);
      setError('Gagal memuat data kotak dan lokasi.');
    }
  }, []);

  // Fetch seeded items data
  const fetchSeededItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch seeded items
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      if (selectedBox !== 'all') params.append('boxId', selectedBox);
      
      const response = await fetch(`/api/seeded-items?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch seeded items');
      const data = await response.json();
      setSeededItems(data);
      
      setError('');
    } catch (error) {
      console.error('Failed to fetch seeded items:', error);
      setError('Gagal memuat data item seeded.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLocation, selectedBox]);

  // Initial data fetch
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchBoxesAndLocations();
      fetchSeededItems();
    }
  }, [status, router, fetchBoxesAndLocations, fetchSeededItems]);

  // Refetch seeded items when filters change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSeededItems();
    }
  }, [searchQuery, selectedLocation, selectedBox, status, fetchSeededItems]);

  const handleReturnItems = async () => {
    if (selectedItems.length === 0) {
      setError('Pilih setidaknya satu item untuk dikembalikan');
      return;
    }

    // Validate return items
    for (const item of returnItems) {
      if (!item.boxId) {
        setError(`Pilih lokasi penyimpanan untuk semua item`);
        return;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        setError(`Jumlah item harus lebih dari 0`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/seeded-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: returnItems
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Item berhasil dikembalikan ke penyimpanan');
        setShowReturnDialog(false);
        setSelectedItems([]);
        setReturnItems([]);
        fetchSeededItems();
      } else {
        setError(data.error || 'Gagal mengembalikan item');
      }
    } catch (error) {
      console.error('Failed to return items:', error);
      setError('Terjadi kesalahan saat mengembalikan item');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItems = async () => {
    if (selectedItems.length === 0) {
      setError('Pilih setidaknya satu item untuk dihapus');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/seeded-items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockIds: selectedItems,
          notes: deleteNotes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Item berhasil dihapus');
        setShowDeleteDialog(false);
        setSelectedItems([]);
        setDeleteNotes('');
        fetchSeededItems();
      } else {
        setError(data.error || 'Gagal menghapus item');
      }
    } catch (error) {
      console.error('Failed to delete items:', error);
      setError('Terjadi kesalahan saat menghapus item');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAll = (checked: boolean | string) => {
    // Convert to boolean if it's a string
    const isChecked = typeof checked === 'boolean' ? checked : checked === 'true';
    
    if (isChecked) {
      setSelectedItems(seededItems.map(item => item.stock.id));
      // Initialize return items
      const newReturnItems = seededItems.map(item => ({
        stockId: item.stock.id,
        boxId: '',
        quantity: item.stock.seeded,
        condition: 'good' as const,
        notes: ''
      }));
      setReturnItems(newReturnItems);
    } else {
      setSelectedItems([]);
      setReturnItems([]);
    }
  };

  const handleSelectItem = (stockId: string, checked: boolean | string) => {
    // Convert to boolean if it's a string
    const isChecked = typeof checked === 'boolean' ? checked : checked === 'true';
    
    if (isChecked) {
      setSelectedItems([...selectedItems, stockId]);
      
      // Add to return items if not already there
      const item = seededItems.find(i => i.stock.id === stockId);
      if (item && !returnItems.some(ri => ri.stockId === stockId)) {
        setReturnItems([
          ...returnItems,
          {
            stockId,
            boxId: '',
            quantity: item.stock.seeded,
            condition: 'good' as const,
            notes: ''
          }
        ]);
      }
    } else {
      setSelectedItems(selectedItems.filter(id => id !== stockId));
      setReturnItems(returnItems.filter(item => item.stockId !== stockId));
    }
  };

  const updateReturnItem = (stockId: string, field: keyof ReturnItem, value: any) => {
    setReturnItems(prevItems => 
      prevItems.map(item => 
        item.stockId === stockId ? { ...item, [field]: value } : item
      )
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLocation('all');
    setSelectedBox('all');
  };

  // Filter boxes based on selected location
  const filteredBoxes = selectedLocation === 'all' 
    ? boxes 
    : boxes.filter(box => box.location?.id === selectedLocation);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Item Seeded</h1>
            <p className="text-muted-foreground">
              Kelola item yang telah di-seed untuk display
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (selectedItems.length > 0) {
                setShowReturnDialog(true);
              } else {
                setError('Pilih setidaknya satu item untuk dikembalikan');
              }
            }}
            disabled={selectedItems.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Kembalikan ke Penyimpanan
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => {
              if (selectedItems.length > 0) {
                setShowDeleteDialog(true);
              } else {
                setError('Pilih setidaknya satu item untuk dihapus');
              }
            }}
            disabled={selectedItems.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Item
          </Button>
          <Button onClick={fetchSeededItems} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Segarkan
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Lokasi</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedBox} onValueChange={setSelectedBox}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kotak" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kotak</SelectItem>
                  {filteredBoxes.map(box => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.boxNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Hapus Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seeded Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Item Seeded</span>
            <Badge variant="secondary">
              {seededItems.length} item
            </Badge>
          </CardTitle>
          <CardDescription>
            Daftar semua item yang telah di-seed untuk display
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seededItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak Ada Item Seeded</h3>
              <p className="text-muted-foreground">
                Tidak ada item yang di-seed saat ini
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === seededItems.length && seededItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Kode Produk</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Merek</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Kotak</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Jumlah Seeded</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seededItems.map((item) => (
                    <TableRow key={item.stock.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.stock.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.stock.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.item.productCode}
                      </TableCell>
                      <TableCell>{item.item.description}</TableCell>
                      <TableCell>{item.item.brandCode}</TableCell>
                      <TableCell>
                        {item.location ? (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {item.location.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Tidak ada lokasi</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.box ? (
                          <div className="flex items-center">
                            <Box className="h-4 w-4 mr-2 text-muted-foreground" />
                            {item.box.boxNumber}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Tidak ada kotak</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.stock.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.stock.seeded} {item.item.unitOfMeasure}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItems([item.stock.id]);
                              setReturnItems([{
                                stockId: item.stock.id,
                                boxId: '',
                                quantity: item.stock.seeded,
                                condition: 'good',
                                notes: ''
                              }]);
                              setShowReturnDialog(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedItems([item.stock.id]);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <RotateCcw className="h-5 w-5 mr-2" />
              Kembalikan Item ke Penyimpanan
            </DialogTitle>
            <DialogDescription>
              Anda akan mengembalikan {selectedItems.length} item ke penyimpanan.
              Item akan kembali tersedia untuk dipinjam.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Kotak</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnItems.map((returnItem) => {
                  const item = seededItems.find(i => i.stock.id === returnItem.stockId);
                  if (!item) return null;
                  
                  // Get current location ID from selected box
                  const currentLocationId = returnItem.boxId 
                    ? boxes.find(b => b.id === returnItem.boxId)?.location?.id || ''
                    : '';
                  
                  // Filter boxes by current location
                  const boxesForCurrentLocation = boxes.filter(box => 
                    box.location?.id === currentLocationId
                  );
                  
                  return (
                    <TableRow key={returnItem.stockId}>
                      <TableCell className="font-medium">
                        {item.item.description}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max={item.stock.seeded}
                          value={returnItem.quantity}
                          onChange={(e) => updateReturnItem(returnItem.stockId, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={currentLocationId}
                          onValueChange={(locationId) => {
                            // Find a box in this location
                            const boxInLocation = boxes.find(b => b.location?.id === locationId);
                            if (boxInLocation) {
                              updateReturnItem(returnItem.stockId, 'boxId', boxInLocation.id);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih lokasi" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map(location => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={returnItem.boxId}
                          onValueChange={(boxId) => updateReturnItem(returnItem.stockId, 'boxId', boxId)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kotak" />
                          </SelectTrigger>
                          <SelectContent>
                            {boxesForCurrentLocation.map(box => (
                              <SelectItem key={box.id} value={box.id}>
                                {box.boxNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={returnItem.condition}
                          onValueChange={(value) => updateReturnItem(returnItem.stockId, 'condition', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Catatan"
                          value={returnItem.notes}
                          onChange={(e) => updateReturnItem(returnItem.stockId, 'notes', e.target.value)}
                          rows={1}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleReturnItems}
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Kembalikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Hapus Item Seeded
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus {selectedItems.length} item dari sistem.
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deleteNotes">Catatan (Opsional)</Label>
              <Textarea
                id="deleteNotes"
                value={deleteNotes}
                onChange={(e) => setDeleteNotes(e.target.value)}
                placeholder="Tambahkan catatan untuk penghapusan ini"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteItems}
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}