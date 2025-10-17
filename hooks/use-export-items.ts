// hooks/use-export-items.ts
import { useState } from 'react';
import { toast } from 'sonner';

export function useExportItems() {
  const [isExporting, setIsExporting] = useState(false);

  const exportItems = async (itemIds: string[], format: 'csv' | 'excel' = 'csv') => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/items/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds,
          format,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export items');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `items_export.${format === 'csv' ? 'csv' : 'xls'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Items exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting items:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export items');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportItems, isExporting };
}