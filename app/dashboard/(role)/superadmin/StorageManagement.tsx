// app/dashboard/(role)/superadmin/StorageManagement.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BoxIcon, MapPin, Package, AlertTriangle, Plus, Eye, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Location {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Box {
  id: string;
  boxNumber: string;
  description: string | null;
  location: {
    id: string;
    name: string;
  } | null;
}

interface LowStockItem {
  productCode: string;
  description: string;
  totalStock: number;
  stockRecords: Array<{
    box: {
      id: string;
      boxNumber: string;
      description: string | null;
    } | null;
    location: {
      id: string;
      name: string;
    } | null;
  }>;
}

export default function StorageManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch locations
        const locationsResponse = await fetch('/api/locations');
        if (locationsResponse.ok) {
          const locationsData: Location[] = await locationsResponse.json();
          setLocations(locationsData);
        }
        
        // Fetch boxes
        const boxesResponse = await fetch('/api/boxes');
        if (boxesResponse.ok) {
          const boxesData: Box[] = await boxesResponse.json();
          setBoxes(boxesData);
        }
        
        // Fetch low stock items
        const itemsResponse = await fetch('/api/items');
        if (itemsResponse.ok) {
          const itemsData: LowStockItem[] = await itemsResponse.json();
          // Filter items with low stock (less than 10)
          const lowStock = itemsData.filter(item => item.totalStock < 10);
          setLowStockItems(lowStock);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const totalLocations = locations.length;
  const totalBoxes = boxes.length;
  const totalItems = boxes.reduce((sum, box) => sum + (box.location ? 1 : 0), 0); // Simplified calculation
  const totalLowStockItems = lowStockItems.length;

  // Group boxes by location
  const boxesByLocation = boxes.reduce((acc, box) => {
    const locationName = box.location?.name || 'Unknown';
    if (!acc[locationName]) {
      acc[locationName] = [];
    }
    acc[locationName].push(box);
    return acc;
  }, {} as Record<string, Box[]>);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Memuat data manajemen penyimpanan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error memuat data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                Coba Lagi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Segarkan Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Lokasi
            </CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Kotak
            </CardTitle>
            <BoxIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBoxes}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Item Tersimpan
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Item Stok Rendah
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Locations and Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Locations */}
        {locations.length > 0 && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Lokasi Penyimpanan
              </CardTitle>
              <CardDescription>
                Ikhtisar semua lokasi penyimpanan
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {locations.map((location) => {
                  const boxCount = boxes.filter(box => box.location?.id === location.id).length;
                  return (
                    <div key={location.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-green-50 transition-colors">
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-gray-500">{boxCount} kotak</div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                        {boxCount} kotak
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/stock-locations">
                    <Plus className="h-4 w-4 mr-2" />
                    Kelola Lokasi
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Storage Boxes */}
        {boxes.length > 0 && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <BoxIcon className="h-5 w-5 text-blue-600" />
                Kotak Penyimpanan
              </CardTitle>
              <CardDescription>
                Ikhtisar kotak penyimpanan
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {boxes.slice(0, 5).map((box) => (
                  <div key={box.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                    <div>
                      <div className="font-medium">{box.boxNumber}</div>
                      <div className="text-sm text-gray-500">{box.location?.name || 'Unknown'}</div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                      Kotak
                    </Badge>
                  </div>
                ))}
                {boxes.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{boxes.length - 5} kotak lainnya
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/storage">
                    <Plus className="h-4 w-4 mr-2" />
                    Kelola Kotak
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
          <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Item Stok Rendah
            </CardTitle>
            <CardDescription>
              Item dengan stok rendah yang membutuhkan perhatian
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Produk</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.productCode} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.productCode}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.totalStock}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.stockRecords[0]?.location?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/items/${item.productCode}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button className="w-full md:w-auto bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700" asChild>
          <Link href="/dashboard/item-movements">
            <Plus className="h-4 w-4 mr-2" />
            Lihat Pergerakan Stok
          </Link>
        </Button>
      </div>
    </div>
  );
}