'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, 
  FaTrash, 
  FaArrowRight, 
  FaBoxOpen, 
  FaArrowLeft, 
  FaFileExcel, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaSearch,
  FaInfoCircle,
  FaTimes,
  FaDownload
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

interface SKUItem {
  sku: string;
  exists?: boolean;
  stock?: number;
  variants?: { 
    variantCode: string; 
    stock: number;
    jubelioItemId: number;
  }[];
}

interface ImportResult {
  sku: string;
  status: 'pending' | 'valid' | 'invalid';
  stock?: number;
  variants?: { 
    variantCode: string; 
    stock: number;
    jubelioItemId: number;
  }[];
  error?: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string[];
}

export default function ItemInputPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skuInput, setSkuInput] = useState('');
  const [selectedSKUs, setSelectedSKUs] = useState<SKUItem[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Toast management
  const addToast = (type: 'success' | 'error' | 'info', message: string, details?: string[]) => {
    const id = toastIdRef.current;
    toastIdRef.current += 1;
    setToasts(prev => [...prev, { id, type, message, details }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

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

  // Function to validate SKU against Business Central API
  const validateSKU = async (sku: string): Promise<{ 
    exists: boolean; 
    stock?: number; 
    variants?: { 
      variantCode: string; 
      stock: number;
      jubelioItemId: number;
    }[] 
  }> => {
    try {
      console.log('Validating SKU:', sku); // Log for debugging
      
      const response = await fetch('/api/validate-sku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Validation failed:', errorData);
        throw new Error(errorData.error || 'Validation failed');
      }

      const data = await response.json();
      console.log('Validation response:', data); // Log for debugging
      
      return { 
        exists: data.exists, 
        stock: data.stock,
        variants: data.variants
      };
    } catch (error) {
      console.error('Error validating SKU:', error);
      return { exists: false };
    }
  };

  const handleAddSKU = async () => {
    const sku = skuInput.trim();
    if (!sku) {
      addToast('error', 'SKU cannot be empty');
      return;
    }

    // Check if SKU already exists
    if (selectedSKUs.some(item => item.sku.toLowerCase() === sku.toLowerCase())) {
      addToast('error', 'SKU already exists', [`SKU ${sku} is already in your list`]);
      return;
    }

    setIsValidating(true);
    addToast('info', `Validating SKU ${sku}...`);

    try {
      const validation = await validateSKU(sku);
      
      if (!validation.exists) {
        addToast('error', `SKU ${sku} not found`, [`The SKU ${sku} does not exist in the Business Central database`]);
      } else {
        // Add to selected SKUs with validation info
        setSelectedSKUs([...selectedSKUs, { 
          sku, 
          exists: true, 
          stock: validation.stock,
          variants: validation.variants
        }]);
        setSkuInput('');
        addToast('success', `SKU ${sku} added successfully`, validation.stock !== undefined ? [`Available stock: ${validation.stock}`] : undefined);
      }
    } catch (error) {
      addToast('error', 'Error validating SKU', [error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveSKU = (sku: string) => {
    setSelectedSKUs(selectedSKUs.filter(item => item.sku !== sku));
    addToast('info', `Removed SKU ${sku}`);
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addToast('info', 'Processing file...');
    setShowImportDetails(true);
    setImportResults([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          addToast('error', 'No data found in the Excel file');
          return;
        }

        // Extract SKUs (look for common column names)
        const skuColumn = Object.keys(jsonData[0]).find(key => 
          key.toLowerCase().includes('sku') || 
          key.toLowerCase().includes('item') || 
          key.toLowerCase().includes('product')
        );

        if (!skuColumn) {
          addToast('error', 'Could not find SKU column in the Excel file', ['Please ensure your file has a column named "SKU", "Item", or "Product"']);
          return;
        }

        // Get SKUs and trim them
        const skus = jsonData.map(row => String(row[skuColumn]).trim()).filter(Boolean);
        
        if (skus.length === 0) {
          addToast('error', 'No valid SKUs found in the Excel file');
          return;
        }

        // Remove duplicates (case-insensitive) but preserve original case
        const uniqueSKUsMap = new Map<string, string>();
        const uniqueSKUs: string[] = [];
        
        skus.forEach(sku => {
          const lowerSku = sku.toLowerCase();
          if (!uniqueSKUsMap.has(lowerSku)) {
            uniqueSKUsMap.set(lowerSku, sku);
            uniqueSKUs.push(sku);
          }
        });
        
        // Check against existing SKUs (case-insensitive)
        const existingSKUsLower = selectedSKUs.map(item => item.sku.toLowerCase());
        const newSKUs = uniqueSKUs.filter(sku => !existingSKUsLower.includes(sku.toLowerCase()));
        
        if (newSKUs.length === 0) {
          addToast('error', 'All SKUs already exist in your list');
          return;
        }

        // Initialize import results with pending status
        const initialResults: ImportResult[] = newSKUs.map(sku => ({
          sku,
          status: 'pending'
        }));
        
        setImportResults(initialResults);
        setIsValidating(true);
        addToast('info', 'Validating SKUs...');

        // Validate SKUs against Business Central - process sequentially to avoid overwhelming the API
        const updatedResults = [...initialResults];
        
        for (let i = 0; i < newSKUs.length; i++) {
          const sku = newSKUs[i];
          try {
            console.log(`Validating SKU from Excel: ${sku}`); // Log for debugging
            
            const validation = await validateSKU(sku);
            
            if (validation.exists) {
              updatedResults[i] = {
                sku,
                status: 'valid',
                stock: validation.stock,
                variants: validation.variants
              };
            } else {
              updatedResults[i] = {
                sku,
                status: 'invalid',
                error: 'SKU not found in Business Central'
              };
            }
          } catch (error) {
            console.error(`Error validating SKU ${sku}:`, error);
            updatedResults[i] = {
              sku,
              status: 'invalid',
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
          
          // Update the state to show progress
          setImportResults([...updatedResults]);
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Count valid and invalid SKUs
        const validSKUs = updatedResults.filter(r => r.status === 'valid');
        const invalidSKUs = updatedResults.filter(r => r.status === 'invalid');
        
        if (validSKUs.length === 0) {
          addToast('error', 'None of the SKUs are valid', invalidSKUs.length > 0 
            ? [`Invalid SKUs: ${invalidSKUs.map(r => r.sku).join(', ')}`] 
            : ['No valid SKUs found']
          );
        } else {
          // Add valid SKUs to selected list
          const newValidItems = validSKUs.map(item => ({
            sku: item.sku,
            exists: true,
            stock: item.stock,
            variants: item.variants
          }));
          
          setSelectedSKUs(prev => [...prev, ...newValidItems]);
          
          addToast('success', `Successfully imported ${validSKUs.length} SKU(s)`, [
            invalidSKUs.length > 0 ? `Skipped ${invalidSKUs.length} invalid SKU(s)` : undefined,
            validSKUs.some(item => item.stock !== undefined) 
              ? 'Stock information retrieved for valid SKUs' 
              : undefined
          ].filter(Boolean) as string[]);
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        addToast('error', 'Error processing Excel file', ['Please ensure the file is a valid Excel file (.xlsx or .xls)']);
        console.error('Error processing Excel file:', error);
      } finally {
        setIsValidating(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map((toast) => (
          <div
            key={`toast-${toast.id}`} // Fixed: Added unique key prefix
            className={`rounded-lg shadow-lg p-4 flex items-start animate-in slide-in-from-top-5 ${
              toast.type === 'success' 
                ? 'bg-white border-l-4 border-primary-500' 
                : toast.type === 'error'
                  ? 'bg-white border-l-4 border-red-500'
                  : 'bg-white border-l-4 border-primary-300'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <FaCheckCircle className="text-primary-500 text-lg" />
              ) : toast.type === 'error' ? (
                <FaExclamationTriangle className="text-red-500 text-lg" />
              ) : (
                <FaInfoCircle className="text-primary-300 text-lg" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{toast.message}</p>
              {toast.details && toast.details.length > 0 && (
                <ul className="mt-1 text-xs text-gray-600 list-disc pl-4">
                  {toast.details.map((detail, index) => (
                    <li key={`detail-${toast.id}-${index}`}>{detail}</li> // Fixed: Added unique key
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-primary-600 mb-3 transition-colors text-sm font-medium"
          >
            <FaArrowLeft className="mr-2" />
            Back to Menu
          </button>
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">B2B Item Selection</h1>
              <p className="text-sm text-gray-600">
                Select items to create your B2B order • <span className="font-medium text-primary-600">{session.user?.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        {/* Stats Cards */}
        {selectedSKUs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedSKUs.length}</p>
                </div>
                <div className="bg-primary-100 p-3 rounded-lg">
                  <FaBoxOpen className="text-primary-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Validated</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedSKUs.filter(item => item.exists).length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <FaCheckCircle className="text-green-600 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">With Variants</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedSKUs.filter(item => item.variants && item.variants.length > 0).length}
                  </p>
                </div>
                <div className="bg-primary-100 p-3 rounded-lg">
                  <FaInfoCircle className="text-primary-600 text-xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Manual Input */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="bg-primary-100 p-2 rounded-lg mr-3">
                  <FaPlus className="text-primary-600" />
                </div>
                Add Single Item
              </h2>
              <p className="text-sm text-gray-500 mt-1">Enter SKU to validate and add</p>
            </div>
            
            <div className="p-5">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder="Enter SKU (e.g., ITEM-001)"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSKU()}
                  disabled={isValidating}
                />
                
                <button
                  onClick={handleAddSKU}
                  disabled={isValidating || !skuInput.trim()}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-95 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Validating
                    </>
                  ) : (
                    <>
                      <FaSearch className="mr-2" />
                      Add Item
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-primary-800 text-xs flex items-start">
                  <FaInfoCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Each SKU is validated against Business Central before being added to ensure accuracy.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Excel Import */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <FaFileExcel className="text-green-600" />
                </div>
                Import from Excel
              </h2>
              <p className="text-sm text-gray-500 mt-1">Upload multiple items at once</p>
            </div>
            
            <div className="p-5">
              <button
                onClick={handleImportClick}
                disabled={isValidating}
                className="w-full px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center mb-3"
              >
                <FaFileExcel className="mr-2" />
                Choose Excel File
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
                disabled={isValidating}
              />
              
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-primary-800 text-xs flex items-start mb-2">
                  <FaInfoCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span className="font-medium">Excel file requirements:</span>
                </p>
                <ul className="text-primary-800 text-xs space-y-1 pl-6 list-disc">
                  <li>Column named "SKU", "Item", or "Product"</li>
                  <li>One SKU per row</li>
                  <li>Supports .xlsx and .xls formats</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Import Details */}
        {showImportDetails && importResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-5 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaInfoCircle className="mr-2 text-primary-600" />
                  Import Progress
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-600">
                    Total: <span className="font-semibold">{importResults.length}</span>
                  </span>
                  <span className="text-xs text-green-600">
                    Valid: <span className="font-semibold">{importResults.filter(r => r.status === 'valid').length}</span>
                  </span>
                  <span className="text-xs text-red-600">
                    Invalid: <span className="font-semibold">{importResults.filter(r => r.status === 'invalid').length}</span>
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowImportDetails(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-5 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {importResults.map((result) => (
                  <div key={`import-${result.sku}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{result.sku}</span>
                      {result.status === 'valid' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <FaCheckCircle className="mr-1" /> Valid
                        </span>
                      ) : result.status === 'invalid' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <FaExclamationTriangle className="mr-1" /> Invalid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <div className="w-2 h-2 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-1" />
                          Validating
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {result.stock !== undefined && <span>Stock: {result.stock}</span>}
                      {result.variants && <span>Variants: {result.variants.length}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
              <span className="flex items-center">
                <div className="bg-primary-100 p-2 rounded-lg mr-3">
                  <FaBoxOpen className="text-primary-600" />
                </div>
                Selected Items
              </span>
              {selectedSKUs.length > 0 && (
                <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {selectedSKUs.length}
                </span>
              )}
            </h2>
          </div>
          
          <div className="p-5">
            {selectedSKUs.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBoxOpen className="text-gray-400 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No items selected</h3>
                <p className="text-sm text-gray-500">Add items using the form above or import from Excel</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Variants</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedSKUs.map((item) => (
                      <tr key={`item-${item.sku}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <span className="font-mono font-medium text-gray-900">
                            {item.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.exists ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <FaCheckCircle className="mr-1" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              <FaExclamationTriangle className="mr-1" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.stock !== undefined ? item.stock : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.variants ? (
                            <div className="flex flex-wrap gap-1">
                              {item.variants.map((variant, index) => (
                                <span key={`variant-${item.sku}-${index}`} className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs font-medium">
                                  {variant.variantCode}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveSKU(item.sku)}
                            className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Continue Button */}
      {selectedSKUs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedSKUs.length}</span> item(s) selected
              </div>
              <button
                onClick={handleContinue}
                className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-95 transition-all font-semibold shadow-md"
              >
                Continue to Stock Input
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}