'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaPlus, FaTrash, FaArrowRight, FaBoxOpen, FaArrowLeft, FaFileExcel, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { sampleB2BItems, B2BItem } from '@/data/b2b-item-data';
import * as XLSX from 'xlsx';

export default function ItemInputPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<B2BItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<B2BItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'success' | 'error' | 'processing';
    message: string;
    details?: string[];
  }>({ type: 'idle', message: '' });

  // Load selected items from localStorage on mount
  useEffect(() => {
    const storedItems = localStorage.getItem('b2bSelectedItems');
    if (storedItems) {
      setSelectedItems(JSON.parse(storedItems));
    }
  }, []);

  // Save selected items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('b2bSelectedItems', JSON.stringify(selectedItems));
  }, [selectedItems]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  // Filter items based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems([]);
      setIsDropdownOpen(false);
      return;
    }

    const filtered = sampleB2BItems.filter(item =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.divisionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredItems(filtered);
    setIsDropdownOpen(true);
  }, [searchTerm]);

  const handleAddItem = (item: B2BItem) => {
    // Check if item is already selected
    if (!selectedItems.some(selected => selected.sku === item.sku)) {
      setSelectedItems([...selectedItems, item]);
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemoveItem = (sku: string) => {
    setSelectedItems(selectedItems.filter(item => item.sku !== sku));
  };

  const handleContinue = () => {
    router.push('/b2b-dashboard/item-details');
  };

  const handleBack = () => {
    router.push('/menu-selection');
  };

  const getTotalVariants = () => {
    return selectedItems.reduce((total, item) => total + item.variants.length, 0);
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

        const skus = jsonData.map(row => row[skuColumn]).filter(Boolean);
        
        if (skus.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'No valid SKUs found in the Excel file',
          });
          return;
        }

        // Find matching items
        const foundItems: B2BItem[] = [];
        const notFoundSkus: string[] = [];
        
        skus.forEach(sku => {
          const item = sampleB2BItems.find(item => 
            item.sku.toLowerCase() === String(sku).toLowerCase()
          );
          
          if (item && !selectedItems.some(selected => selected.sku === item.sku)) {
            foundItems.push(item);
          } else if (!item) {
            notFoundSkus.push(String(sku));
          }
        });

        // Add found items to selected items
        if (foundItems.length > 0) {
          setSelectedItems(prev => [...prev, ...foundItems]);
        }

        // Set status message
        if (foundItems.length > 0 && notFoundSkus.length === 0) {
          setImportStatus({
            type: 'success',
            message: `Successfully imported ${foundItems.length} item(s)`,
          });
        } else if (foundItems.length > 0 && notFoundSkus.length > 0) {
          setImportStatus({
            type: 'success',
            message: `Imported ${foundItems.length} item(s). ${notFoundSkus.length} SKU(s) not found.`,
            details: notFoundSkus.slice(0, 10) // Show first 10 not found SKUs
          });
        } else {
          setImportStatus({
            type: 'error',
            message: 'No matching items found',
            details: notFoundSkus.slice(0, 10) // Show first 10 not found SKUs
          });
        }

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
              disabled={selectedItems.length === 0}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Continue to Stock Input
              <FaArrowRight className="ml-2" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Selected SKUs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{selectedItems.length}</p>
                </div>
                <div className="bg-primary-100 p-3 rounded-full">
                  <FaBoxOpen className="text-primary-600 text-2xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Variants</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{getTotalVariants()}</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                  <FaBoxOpen className="text-emerald-600 text-2xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-violet-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Available Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{sampleB2BItems.length}</p>
                </div>
                <div className="bg-violet-100 p-3 rounded-full">
                  <FaSearch className="text-violet-600 text-2xl" />
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

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaSearch className="mr-2" /> Search Items
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by SKU, brand, division or category..."
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <div
                          key={item.sku}
                          className="p-4 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => handleAddItem(item)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded text-xs font-mono font-semibold">
                                  {item.sku}
                                </span>
                                <span className="text-gray-400 text-xs">
                                  {item.variants.length} variants
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">{item.brandName}</span>
                                <span className="mx-2">•</span>
                                <span>{item.divisionName}</span>
                                <span className="mx-2">•</span>
                                <span>{item.categoryName}</span>
                              </div>
                            </div>
                            <div className="ml-4 bg-primary-500 text-white p-2 rounded-full">
                              <FaPlus />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FaSearch className="text-gray-400 text-2xl" />
                        </div>
                        <p className="text-gray-500 font-medium">No items found</p>
                        <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
                The column should be named "SKU", "Item", or "Product". Only SKUs that exist in our system will be added.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Items Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center justify-between">
              <span className="flex items-center">
                <FaBoxOpen className="mr-2" /> Selected Items
              </span>
              {selectedItems.length > 0 && (
                <span className="bg-white text-emerald-600 px-3 py-1 rounded-full text-sm font-bold">
                  {selectedItems.length} items
                </span>
              )}
            </h2>
          </div>
          
          <div className="p-6">
            {selectedItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBoxOpen className="text-gray-400 text-4xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No items selected yet</h3>
                <p className="text-gray-500 mb-6">Search and add items using the search bar above or import from Excel</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Division</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sizes Available</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedItems.map((item) => (
                        <tr key={item.sku} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="bg-primary-100 text-primary-700 px-3 py-1 rounded text-xs font-mono font-semibold inline-block">
                              {item.sku}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.brandName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.divisionName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.categoryName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex flex-wrap gap-1">
                              {item.variants.map((variant, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                  {variant.size}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleRemoveItem(item.sku)}
                              className="inline-flex items-center justify-center w-10 h-10 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove item"
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