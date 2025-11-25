// app/dashboard/(role)/storage-master/StorageBoxes.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BoxIcon, MapPin, AlertCircle, Package } from 'lucide-react';
import Link from 'next/link';

interface Box {
  id: string;
  boxNumber: string;
  description: string | null;
  location: {
    id: string;
    name: string;
  } | null;
}

interface LocationBoxes {
  locationName: string;
  locationId: string;
  boxes: Box[];
}

export default function StorageBoxes() {
  const [locationBoxes, setLocationBoxes] = useState<LocationBoxes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorageBoxes();
  }, []);

  const fetchStorageBoxes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/boxes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch storage boxes');
      }
      
      const data = await response.json();
      
      // Group boxes by location
      const groupedByLocation: Record<string, LocationBoxes> = {};
      
      data.forEach((box: Box) => {
        const locationName = box.location?.name || 'Unassigned';
        const locationId = box.location?.id || 'unassigned';
        
        if (!groupedByLocation[locationId]) {
          groupedByLocation[locationId] = {
            locationName,
            locationId,
            boxes: [],
          };
        }
        
        groupedByLocation[locationId].boxes.push(box);
      });
      
      // Convert to array and sort by location name
      const locationBoxesArray = Object.values(groupedByLocation)
        .sort((a, b) => a.locationName.localeCompare(b.locationName));
      
      setLocationBoxes(locationBoxesArray);
    } catch (err) {
      console.error('Error fetching storage boxes:', err);
      setError('Failed to load storage boxes');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoxIcon className="h-5 w-5 text-purple-500" />
            Storage Boxes
          </CardTitle>
          <CardDescription>
            Storage boxes organized by location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Loading storage boxes...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoxIcon className="h-5 w-5 text-purple-500" />
            Storage Boxes
          </CardTitle>
          <CardDescription>
            Storage boxes organized by location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={fetchStorageBoxes} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BoxIcon className="h-5 w-5 text-purple-500" />
          Storage Boxes
        </CardTitle>
        <CardDescription>
          Storage boxes organized by location
        </CardDescription>
      </CardHeader>
      <CardContent>
        {locationBoxes.length > 0 ? (
          <div className="space-y-6">
            {locationBoxes.map((location) => (
              <div key={location.locationId} className="border rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <MapPin className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold">{location.locationName}</h3>
                  <Badge variant="secondary" className="ml-2">
                    {location.boxes.length} box{location.boxes.length !== 1 ? 'es' : ''}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {location.boxes.map((box) => (
                    <div key={box.id} className="border rounded-md p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center mb-2">
                        <BoxIcon className="h-4 w-4 text-purple-500 mr-2" />
                        <span className="font-medium">{box.boxNumber}</span>
                      </div>
                      {box.description && (
                        <p className="text-sm text-gray-600 truncate">{box.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/storage">View All Storage Boxes</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BoxIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Storage Boxes</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No storage boxes have been created yet. Create boxes to organize your inventory.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}