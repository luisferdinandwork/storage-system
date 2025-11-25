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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Package, MapPin, Box, Search, Filter, X, Plus, Building, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Interfaces remain the same
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

interface TableItem {
  id: string;
  itemId: string;
  productCode: string;
  description: string;
  inStorage: number;
  condition: string;
  conditionNotes: string;
  unitOfMeasure: string;
  locationId: string;
  locationName: string;
  boxId: string;
  boxNumber: string;
  isHighlighted: boolean;
  isFiltered: boolean;
}

export default function ItemMovementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [locationsWithBoxes, setLocationsWithBoxes] = useState<LocationWithBoxes[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
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
  
  // Move items states
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [destinationLocation, setDestinationLocation] = useState<string>('');
  const [destinationBox, setDestinationBox] = useState<string>('');
  const [moveNotes, setMoveNotes] = useState('');
  const [isMoving, setIsMoving] = useState(false);

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
        const boxesInLocation = boxesData
          .filter((box: Box) => box.location.id === location.id)
          .map((box: Box) => {
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

  // Flatten data for table view
  const tableData = useMemo(() => {
    const items: TableItem[] = [];
    
    locationsWithBoxes.forEach(loc => {
      loc.boxes.forEach(box => {
        box.items.forEach(item => {
          // Check if item matches search
          const matchesSearch = searchQuery === '' || 
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            box.box.boxNumber.toLowerCase().includes(searchQuery.toLowerCase());
          
          // Check if item matches condition filter
          const matchesCondition = selectedCondition === 'all' || item.condition === selectedCondition;
          
          items.push({
            id: item.id,
            itemId: item.itemId,
            productCode: item.productCode,
            description: item.description,
            inStorage: item.inStorage,
            condition: item.condition,
            conditionNotes: item.conditionNotes,
            unitOfMeasure: item.unitOfMeasure,
            locationId: loc.location.id,
            locationName: loc.location.name,
            boxId: box.box.id,
            boxNumber: box.box.boxNumber,
            isHighlighted: matchesSearch,
            isFiltered: matchesCondition
          });
        });
      });
    });
    
    return items;
  }, [locationsWithBoxes, searchQuery, selectedCondition]);

  // Filter table data based on location
  const filteredTableData = useMemo(() => {
    if (selectedLocation === 'all') return tableData;
    return tableData.filter(item => item.locationId === selectedLocation);
  }, [tableData, selectedLocation]);

  // Get boxes for selected destination location
  const destinationBoxes = useMemo(() => {
    if (!destinationLocation) return [];
    const location = locationsWithBoxes.find(loc => loc.location.id === destinationLocation);
    if (!location) return [];
    return location.boxes.map(boxWithItems => boxWithItems.box);
  }, [destinationLocation, locationsWithBoxes]);

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredTableData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleMoveItems = async () => {
    if (selectedItems.length === 0) {
      setError('Pilih minimal satu barang untuk dipindahkan');
      return;
    }
    
    if (!destinationBox) {
      setError('Pilih kotak tujuan');
      return;
    }
    
    setIsMoving(true);
    try {
      const movements = selectedItems.map(itemId => {
        const item = tableData.find(i => i.id === itemId);
        return {
          sourceStockId: itemId,
          itemId: item?.itemId || '',
          quantity: item?.inStorage || 1
        };
      });
      
      const response = await fetch('/api/item-movements/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movements,
          destinationBoxId: destinationBox,
          notes: moveNotes || `Bulk move of ${selectedItems.length} items`
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Berhasil memindahkan ${selectedItems.length} barang`);
        setTimeout(() => setSuccess(''), 3000);
        setSelectedItems([]);
        setShowMoveModal(false);
        setDestinationLocation('');
        setDestinationBox('');
        setMoveNotes('');
        fetchData();
      } else {
        setError(data.error || 'Gagal memindahkan barang');
      }
    } catch (error) {
      console.error('Failed to move items:', error);
      setError('Terjadi kesalahan saat memindahkan barang');
    } finally {
      setIsMoving(false);
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
            Kelola perpindahan barang antar lokasi dan kotak penyimpanan
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
                    {locationsWithBoxes.map(loc => (
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

            {/* Results Count and Actions */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Menampilkan {filteredTableData.length} barang
                {(searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all') && 
                  ' (difilter)'}
              </div>
              
              {selectedItems.length > 0 && (
                <Button 
                  onClick={() => setShowMoveModal(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Pindahkan {selectedItems.length} Barang
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredTableData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all' 
                ? 'Tidak Ada Hasil' 
                : 'Tidak Ada Barang'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || selectedCondition !== 'all' || selectedLocation !== 'all'
                ? 'Tidak ada barang yang sesuai dengan pencarian atau filter Anda.'
                : 'Tidak ada barang yang tersedia.'}
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredTableData.length && filteredTableData.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Kode Barang</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Kotak</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Kondisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableData.map((item) => (
                    <TableRow 
                      key={item.id}
                      className={cn(
                        item.isHighlighted ? "bg-primary/10" : "",
                        !item.isFiltered ? "opacity-50" : ""
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.productCode}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                          {item.locationName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Box className="h-4 w-4 mr-1 text-muted-foreground" />
                          {item.boxNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.inStorage} {item.unitOfMeasure}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.condition}</Badge>
                        {item.conditionNotes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                            {item.conditionNotes}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Move Items Modal */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Pindahkan Barang</DialogTitle>
            <DialogDescription>
              Pindahkan {selectedItems.length} barang ke lokasi dan kotak baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="destinationLocation">Lokasi Tujuan</Label>
              <Select value={destinationLocation} onValueChange={setDestinationLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {locationsWithBoxes.map(loc => (
                    <SelectItem key={loc.location.id} value={loc.location.id}>
                      {loc.location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {destinationLocation && (
              <div>
                <Label htmlFor="destinationBox">Kotak Tujuan</Label>
                <Select value={destinationBox} onValueChange={setDestinationBox}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kotak tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationBoxes.map(box => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.boxNumber} {box.description && `- ${box.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="moveNotes">Catatan (Opsional)</Label>
              <Textarea
                id="moveNotes"
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                placeholder="Masukkan catatan untuk perpindahan ini"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveModal(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleMoveItems}
              disabled={isMoving || !destinationBox}
              className="bg-primary hover:bg-primary/90"
            >
              {isMoving ? 'Memindahkan...' : 'Pindahkan Barang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {locationsWithBoxes.map(loc => (
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