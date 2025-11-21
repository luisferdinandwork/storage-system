// app/dashboard/item-movements/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { RefreshCw, Package, MapPin, Box, GripVertical, Search, Filter, X, Plus, Building } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Box {
  id: string;
  boxNumber: string;
  description: string;
  location: {
    id: string;
    name: string;
  };
}

interface StockItem {
  isHighlighted: any;
  id: string;
  itemId: string;
  productCode: string;
  description: string;
  inStorage: number;
  condition: string;
  conditionNotes: string;
  unitOfMeasure: string;
  box: {
    id: string;
    boxNumber: string;
    location: {
      id: string;
      name: string;
    };
  };
}

interface LocationWithBoxes {
  location: Location;
  boxes: BoxWithItems[];
}

interface BoxWithItems {
  box: Box;
  items: StockItem[];
}

export default function ItemMovementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [locationsWithBoxes, setLocationsWithBoxes] = useState<LocationWithBoxes[]>([]);
  const [draggedItem, setDraggedItem] = useState<StockItem | null>(null);
  const [sourceBoxId, setSourceBoxId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [moveQuantity, setMoveQuantity] = useState(1);
  const [destinationBoxId, setDestinationBoxId] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [showAddBoxDialog, setShowAddBoxDialog] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [newBox, setNewBox] = useState({ boxNumber: '', description: '', locationId: '' });
  const [newLocation, setNewLocation] = useState({ name: '', description: '' });
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const locationsRes = await fetch('/api/locations');
      if (!locationsRes.ok) throw new Error('Failed to fetch locations');
      const locationsData = await locationsRes.json();
      
      const boxesRes = await fetch('/api/boxes');
      if (!boxesRes.ok) throw new Error('Failed to fetch boxes');
      const boxesData = await boxesRes.json();
      
      const stockItemsRes = await fetch('/api/stock-items');
      if (!stockItemsRes.ok) throw new Error('Failed to fetch stock items');
      const stockItemsData = await stockItemsRes.json();
      
      const organizedLocations = locationsData.map((location: Location) => {
        // Find all boxes in this location
        const boxesInLocation = boxesData
          .filter((box: Box) => box.location.id === location.id)
          .map((box: Box) => {
            // Find items in this box
            const itemsInBox = stockItemsData
              .flatMap((item: any) => 
                item.stockRecords
                  .filter((stock: any) => stock.box?.id === box.id)
                  .map((stock: any) => ({
                    id: stock.id,
                    itemId: item.productCode,
                    productCode: item.productCode,
                    description: item.description,
                    inStorage: stock.inStorage,
                    condition: stock.condition,
                    conditionNotes: stock.conditionNotes,
                    unitOfMeasure: item.unitOfMeasure,
                    box: {
                      id: box.id,
                      boxNumber: box.boxNumber,
                      location: {
                        id: location.id,
                        name: location.name
                      }
                    }
                  }))
              )
              .filter((item: StockItem) => item.inStorage > 0);
            
            return {
              box,
              items: itemsInBox
            };
          });
        
        return {
          location,
          boxes: boxesInLocation
        };
      });
      
      setLocationsWithBoxes(organizedLocations);
      setError('');
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Gagal memuat data. Pastikan semua API endpoint tersedia.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique conditions for filter
  const allConditions = useMemo(() => {
    const conditions = new Set<string>();
    locationsWithBoxes.forEach(loc => {
      loc.boxes.forEach(box => {
        box.items.forEach(item => {
          conditions.add(item.condition);
        });
      });
    });
    return Array.from(conditions);
  }, [locationsWithBoxes]);

  // Filter and search logic - now highlighting instead of filtering
  const processedLocations = useMemo(() => {
    return locationsWithBoxes
      .map(locationWithBoxes => {
        // Filter by location
        if (selectedLocation !== 'all' && locationWithBoxes.location.id !== selectedLocation) {
          return null;
        }

        const processedBoxes = locationWithBoxes.boxes
          .map(boxWithItems => {
            // Process items to determine if they match search
            const processedItems = boxWithItems.items.map(item => {
              // Check if item matches search
              const matchesSearch = searchQuery === '' || 
                item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                boxWithItems.box.boxNumber.toLowerCase().includes(searchQuery.toLowerCase());
              
              // Check if item matches condition filter
              const matchesCondition = selectedCondition === 'all' || item.condition === selectedCondition;
              
              return {
                ...item,
                isHighlighted: matchesSearch,
                isFiltered: matchesCondition
              };
            });

            return {
              ...boxWithItems,
              items: processedItems
            };
          });

        return {
          ...locationWithBoxes,
          boxes: processedBoxes
        };
      })
      .filter(Boolean) as LocationWithBoxes[];
  }, [locationsWithBoxes, searchQuery, selectedCondition, selectedLocation]);

  // Count total items
  const totalItems = useMemo(() => {
    return processedLocations.reduce((total, loc) => {
      return total + loc.boxes.reduce((boxTotal, box) => {
        return boxTotal + box.items.length;
      }, 0);
    }, 0);
  }, [processedLocations]);

  const handleDragStart = (item: StockItem, boxId: string) => {
    setDraggedItem(item);
    setSourceBoxId(boxId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetBoxId: string) => {
    if (!draggedItem || !sourceBoxId || sourceBoxId === targetBoxId) {
      setDraggedItem(null);
      setSourceBoxId(null);
      return;
    }

    setDestinationBoxId(targetBoxId);
    setMoveQuantity(draggedItem.inStorage);
    setShowQuantityDialog(true);
  };

  const confirmMove = async () => {
    if (!draggedItem || !destinationBoxId || !sourceBoxId) return;

    try {
      const response = await fetch('/api/item-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: draggedItem.itemId,
          sourceStockId: draggedItem.id,
          destinationBoxId,
          quantity: moveQuantity,
          notes: `Moved ${moveQuantity} ${draggedItem.unitOfMeasure} of ${draggedItem.description}`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Berhasil memindahkan ${moveQuantity} ${draggedItem.unitOfMeasure}`);
        setTimeout(() => setSuccess(''), 3000);
        fetchData();
      } else {
        setError(data.error || 'Gagal memindahkan barang');
      }
    } catch (error) {
      console.error('Failed to move item:', error);
      setError('Terjadi kesalahan saat memindahkan barang');
    } finally {
      setShowQuantityDialog(false);
      setDraggedItem(null);
      setSourceBoxId(null);
      setDestinationBoxId(null);
    }
  };

  const handleAddBox = async () => {
    if (!newBox.boxNumber.trim() || !newBox.locationId) {
      setError('Nomor kotak dan lokasi harus diisi');
      return;
    }

    setIsAddingBox(true);
    try {
      const response = await fetch('/api/boxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBox),
      });

      if (response.ok) {
        setShowAddBoxDialog(false);
        setNewBox({ boxNumber: '', description: '', locationId: '' });
        fetchData();
        setSuccess('Kotak berhasil ditambahkan');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal menambahkan kotak');
      }
    } catch (error) {
      console.error('Failed to add box:', error);
      setError('Terjadi kesalahan saat menambahkan kotak');
    } finally {
      setIsAddingBox(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) {
      setError('Nama lokasi harus diisi');
      return;
    }

    setIsAddingLocation(true);
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      });

      if (response.ok) {
        setShowAddLocationDialog(false);
        setNewLocation({ name: '', description: '' });
        fetchData();
        setSuccess('Lokasi berhasil ditambahkan');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal menambahkan lokasi');
      }
    } catch (error) {
      console.error('Failed to add location:', error);
      setError('Terjadi kesalahan saat menambahkan lokasi');
    } finally {
      setIsAddingLocation(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCondition('all');
    setSelectedLocation('all');
  };

  // Check if user has permission to add boxes/locations
  const canManageStorage = session?.user?.role && 
    ['superadmin', 'storage-master', 'storage-master-manager'].includes(session.user.role);

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Perpindahan Barang</h1>
          <p className="text-muted-foreground">
            Seret dan lepaskan barang untuk memindahkannya antar lokasi
          </p>
        </div>
        <div className="flex gap-2">
          {canManageStorage && (
            <>
              <Button onClick={() => setShowAddBoxDialog(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kotak
              </Button>
              <Button onClick={() => setShowAddLocationDialog(true)} variant="outline" size="sm">
                <Building className="h-4 w-4 mr-2" />
                Tambah Lokasi
              </Button>
            </>
          )}
          <Button onClick={fetchData} variant="outline" size="sm">
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

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan nama barang, kode produk, atau nomor kotak..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-accent' : ''}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Section */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Lokasi</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">Semua Lokasi</option>
                    {processedLocations.map(loc => (
                      <option key={loc.location.id} value={loc.location.id}>
                        {loc.location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Kondisi</label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">Semua Kondisi</option>
                    {allConditions.map(condition => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Hapus Filter
                  </Button>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Menampilkan {totalItems} barang
              {(searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all') && 
                ' (difilter)'}
            </div>
          </div>
        </CardContent>
      </Card>

      {processedLocations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all' 
                ? 'Tidak Ada Hasil' 
                : 'Tidak Ada Lokasi'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all'
                ? 'Tidak ada barang yang sesuai dengan pencarian atau filter Anda.'
                : 'Tidak ada lokasi penyimpanan yang tersedia.'}
            </p>
            {(searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all') ? (
              <Button onClick={clearFilters} variant="outline">
                Hapus Filter
              </Button>
            ) : canManageStorage ? (
              <div className="flex gap-2">
                <Button onClick={() => setShowAddLocationDialog(true)} variant="outline">
                  <Building className="h-4 w-4 mr-2" />
                  Tambah Lokasi
                </Button>
                <Button onClick={() => setShowAddBoxDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kotak
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push('/dashboard/stock-locations')}>
                Kelola Lokasi
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {processedLocations.map((locationWithBoxes) => (
            <Card key={locationWithBoxes.location.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-primary">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  {locationWithBoxes.location.name}
                </CardTitle>
                <CardDescription>
                  {locationWithBoxes.location.description}
                  <span className="ml-2 text-xs">
                    ({locationWithBoxes.boxes.reduce((sum, box) => sum + box.items.length, 0)} barang)
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 max-h-[600px] overflow-y-auto">
                {locationWithBoxes.boxes.length === 0 ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Box className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Tidak ada kotak di lokasi ini</p>
                    {canManageStorage && (
                      <Button 
                        onClick={() => {
                          setShowAddBoxDialog(true);
                          setNewBox({ ...newBox, locationId: locationWithBoxes.location.id });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Kotak
                      </Button>
                    )}
                  </div>
                ) : (
                  locationWithBoxes.boxes.map((boxWithItems) => (
                    <div 
                      key={boxWithItems.box.id}
                      className={`border rounded-lg p-3 transition-colors ${
                        boxWithItems.items.length === 0 
                          ? 'bg-muted/20 border-dashed border-muted-foreground/30' 
                          : 'bg-muted/30'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(boxWithItems.box.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Box className="h-4 w-4 mr-2 text-muted-foreground" />
                          <h3 className="font-medium">{boxWithItems.box.boxNumber}</h3>
                          {boxWithItems.box.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {boxWithItems.box.description}
                            </span>
                          )}
                        </div>
                        <Badge variant={boxWithItems.items.length > 0 ? "default" : "secondary"}>
                          {boxWithItems.items.length} barang
                        </Badge>
                      </div>
                      
                      {boxWithItems.items.length === 0 ? (
                        <div className="text-center py-4">
                          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Kotak kosong</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Seret barang ke sini untuk memindahkannya
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {boxWithItems.items.map((item) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => handleDragStart(item, boxWithItems.box.id)}
                              className={cn(
                                "bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-all",
                                item.isHighlighted ? "border-primary-400 bg-primary-50" : "hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <GripVertical className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className={cn(
                                      "font-medium text-sm leading-tight",
                                      item.isHighlighted ? "text-primary" : ""
                                    )}>
                                      {item.description}
                                    </h4>
                                    <Badge variant="outline" className="flex-shrink-0">
                                      {item.inStorage} {item.unitOfMeasure}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    {item.productCode}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {item.condition}
                                    </Badge>
                                    {item.conditionNotes && (
                                      <span className="text-xs text-muted-foreground truncate">
                                        {item.conditionNotes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {draggedItem && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center z-50">
          <Package className="h-4 w-4 mr-2" />
          Memindahkan: {draggedItem.description}
        </div>
      )}

      {/* Quantity Dialog */}
      {showQuantityDialog && draggedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 max-w-[90vw]">
            <CardHeader>
              <CardTitle className="text-primary">Tentukan Jumlah</CardTitle>
              <CardDescription>
                Berapa banyak {draggedItem.description} yang ingin dipindahkan?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Jumlah</label>
                <Input
                  type="number"
                  min="1"
                  max={draggedItem.inStorage}
                  value={moveQuantity}
                  onChange={(e) => setMoveQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tersedia: {draggedItem.inStorage} {draggedItem.unitOfMeasure}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuantityDialog(false);
                    setDraggedItem(null);
                    setSourceBoxId(null);
                  }}
                >
                  Batal
                </Button>
                <Button onClick={confirmMove} className="bg-primary hover:bg-primary/90">
                  Pindahkan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Box Dialog */}
      <Dialog open={showAddBoxDialog} onOpenChange={setShowAddBoxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Tambah Kotak Baru</DialogTitle>
            <DialogDescription>
              Buat kotak penyimpanan baru di lokasi tertentu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="boxNumber">Nomor Kotak</Label>
              <Input
                id="boxNumber"
                value={newBox.boxNumber}
                onChange={(e) => setNewBox({...newBox, boxNumber: e.target.value})}
                placeholder="Masukkan nomor kotak"
              />
            </div>
            <div>
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                value={newBox.description}
                onChange={(e) => setNewBox({...newBox, description: e.target.value})}
                placeholder="Masukkan deskripsi kotak"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="location">Lokasi</Label>
              <Select value={newBox.locationId} onValueChange={(value) => setNewBox({...newBox, locationId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi" />
                </SelectTrigger>
                <SelectContent>
                  {processedLocations.map(loc => (
                    <SelectItem key={loc.location.id} value={loc.location.id}>
                      {loc.location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBoxDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleAddBox}
              disabled={isAddingBox || !newBox.boxNumber.trim() || !newBox.locationId}
              className="bg-primary hover:bg-primary/90"
            >
              {isAddingBox ? 'Menambahkan...' : 'Tambah Kotak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Tambah Lokasi Baru</DialogTitle>
            <DialogDescription>
              Buat lokasi penyimpanan baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="locationName">Nama Lokasi</Label>
              <Input
                id="locationName"
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                placeholder="Masukkan nama lokasi"
              />
            </div>
            <div>
              <Label htmlFor="locationDescription">Deskripsi (Opsional)</Label>
              <Textarea
                id="locationDescription"
                value={newLocation.description}
                onChange={(e) => setNewLocation({...newLocation, description: e.target.value})}
                placeholder="Masukkan deskripsi lokasi"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLocationDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleAddLocation}
              disabled={isAddingLocation || !newLocation.name.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isAddingLocation ? 'Menambahkan...' : 'Tambah Lokasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}