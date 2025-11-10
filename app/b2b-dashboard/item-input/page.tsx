'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash, FaArrowRight, FaBoxOpen, FaArrowLeft, FaFileExcel, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import * as XLSX from 'xlsx';

interface SKUItem {
  sku: string;
}

export default function ItemInputPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skuInput, setSkuInput] = useState('');
  const [selectedSKUs, setSelectedSKUs] = useState<SKUItem[]>([]);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'success' | 'error' | 'processing';
    message: string;
    details?: string[];
  }>({ type: 'idle', message: '' });

  // Load selected SKUs from localStorage on mount
  useEffect(() => {
    const storedSKUs = localStorage.getItem('b2bSelectedSKUs');
    if (storedSKUs) {
      setSelectedSKUs(JSON.parse(storedSKUs));
    }
  }, []);

  // Save selected SKUs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('b2bSelectedSKUs', JSON.stringify(selectedSKUs));
  }, [selectedSKUs]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  const handleAddSKU = () => {
    const sku = skuInput.trim();
    if (!sku) {
      setImportStatus({
        type: 'error',
        message: 'SKU cannot be empty',
      });
      return;
    }

    // Check if SKU already exists
    if (selectedSKUs.some(item => item.sku.toLowerCase() === sku.toLowerCase())) {
      setImportStatus({
        type: 'error',
        message: 'SKU already exists',
        details: [`SKU ${sku} is already in your list`]
      });
      return;
    }

    // Add to selected SKUs
    setSelectedSKUs([...selectedSKUs, { sku }]);
    setSkuInput('');
    setImportStatus({
      type: 'success',
      message: `SKU ${sku} added successfully`
    });
  };

  const handleRemoveSKU = (sku: string) => {
    setSelectedSKUs(selectedSKUs.filter(item => item.sku !== sku));
  };

  const handleContinue = () => {
    router.push('/b2b-dashboard/item-details');
  };

  const handleBack = () => {
    router.push('/menu-selection');
  };

  // Handle file input click
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process the uploaded Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'processing', message: 'Processing file...' });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'No data found in the Excel file',
          });
          return;
        }

        // Extract SKUs (look for common column names)
        const skuColumn = Object.keys(jsonData[0]).find(key => 
          key.toLowerCase().includes('sku') || 
          key.toLowerCase().includes('item') || 
          key.toLowerCase().includes('product')
        );

        if (!skuColumn) {
          setImportStatus({
            type: 'error',
            message: 'Could not find SKU column in the Excel file',
            details: ['Please ensure your file has a column named "SKU", "Item", or "Product"']
          });
          return;
        }

        const skus = jsonData.map(row => String(row[skuColumn]).trim()).filter(Boolean);
        
        if (skus.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'No valid SKUs found in the Excel file',
          });
          return;
        }

        // Remove duplicates and check against existing
        const uniqueSKUs = Array.from(new Set(skus.map(sku => sku.toLowerCase())));
        const existingSKUs = selectedSKUs.map(item => item.sku.toLowerCase());
        const newSKUs = uniqueSKUs.filter(sku => !existingSKUs.includes(sku));
        
        if (newSKUs.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'All SKUs already exist in your list',
          });
          return;
        }

        // Add new SKUs
        const newItems = newSKUs.map(sku => ({ sku: sku.toUpperCase() }));
        setSelectedSKUs(prev => [...prev, ...newItems]);
        
        setImportStatus({
          type: 'success',
          message: `Successfully imported ${newSKUs.length} SKU(s)`,
          details: newSKUs.length < skus.length 
            ? [`Skipped ${skus.length - newSKUs.length} duplicate SKU(s)`] 
            : undefined
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setImportStatus({
          type: 'error',
          message: 'Error processing Excel file',
          details: ['Please ensure the file is a valid Excel file (.xlsx or .xls)']
        });
        console.error('Error processing Excel file:', error);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-primary-600 mb-4 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Menu
          </button>
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">B2B Item Input</h1>
              <p className="text-gray-600">
                Welcome, <span className="font-semibold text-primary-600">{session.user?.name}</span>
              </p>
            </div>
            
            <button
              onClick={handleContinue}
              disabled={selectedSKUs.length === 0}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Continue to Stock Input
              <FaArrowRight className="ml-2" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedSKUs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Selected SKUs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{selectedSKUs.length}</p>
                </div>
                <div className="bg-primary-100 p-3 rounded-full">
                  <FaBoxOpen className="text-primary-600 text-2xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Available Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">1000+</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                  <FaBoxOpen className="text-emerald-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Status Message */}
        {importStatus.type !== 'idle' && (
          <div className={`mb-6 rounded-lg p-4 flex items-start ${
            importStatus.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : importStatus.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {importStatus.type === 'success' ? (
              <FaCheckCircle className="mt-0.5 mr-3 flex-shrink-0" />
            ) : importStatus.type === 'error' ? (
              <FaExclamationTriangle className="mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{importStatus.message}</p>
              {importStatus.details && importStatus.details.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-medium mb-1">Details:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {importStatus.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add SKU Form */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaPlus className="mr-2" /> Add SKU
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder="Enter SKU"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSKU()}
                />
              </div>
              
              <button
                onClick={handleAddSKU}
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap"
              >
                <FaPlus className="mr-2" />
                Add SKU
              </button>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaFileExcel className="mr-2" /> Import from Excel
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <button
                onClick={handleImportClick}
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap"
              >
                <FaFileExcel className="mr-2" />
                Import from Excel
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <span className="font-medium">Excel Import Instructions:</span> Upload an Excel file with a column containing SKU values. 
                The column should be named "SKU", "Item", or "Product". Duplicate SKUs will be skipped.
              </p>
            </div>
          </div>
        </div>

        {/* Selected SKUs Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center justify-between">
              <span className="flex items-center">
                <FaBoxOpen className="mr-2" /> Selected SKUs
              </span>
              {selectedSKUs.length > 0 && (
                <span className="bg-white text-emerald-600 px-3 py-1 rounded-full text-sm font-bold">
                  {selectedSKUs.length} SKUs
                </span>
              )}
            </h2>
          </div>
          
          <div className="p-6">
            {selectedSKUs.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBoxOpen className="text-gray-400 text-4xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No SKUs selected yet</h3>
                <p className="text-gray-500 mb-6">Add SKUs using the form above or import from Excel</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSKUs.map((item) => (
                        <tr key={item.sku} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="bg-primary-100 text-primary-700 px-3 py-1 rounded text-xs font-mono font-semibold inline-block">
                              {item.sku}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleRemoveSKU(item.sku)}
                              className="inline-flex items-center justify-center w-10 h-10 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove SKU"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Continue Button at Bottom */}
                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleContinue}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-lg font-semibold"
                  >
                    Continue to Stock Input
                    <FaArrowRight className="ml-2" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}