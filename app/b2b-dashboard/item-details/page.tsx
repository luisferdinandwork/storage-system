'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaBoxOpen, FaTrash, FaSave, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaTimes, FaArrowRight, FaSync, FaInfoCircle } from 'react-icons/fa';

interface SKUItem {
  sku: string;
}

interface Variant {
  variantCode: string;
  stock: number;
  jubelioItemId: number;
}

interface B2BItem {
  sku: string;
  brandName?: string;
  divisionName?: string;
  categoryName?: string;
  variants: Variant[];
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string[];
}

export default function ItemDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSKUs, setSelectedSKUs] = useState<SKUItem[]>([]);
  const [validItems, setValidItems] = useState<B2BItem[]>([]);
  const [invalidSKUs, setInvalidSKUs] = useState<string[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
      const skus = JSON.parse(storedSKUs);
      setSelectedSKUs(skus);
      
      // Fetch item details for the SKUs
      fetchItemDetails(skus);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  // Fetch item details from Business Central
  const fetchItemDetails = async (skus: SKUItem[]) => {
    setIsLoading(true);
    addToast('info', 'Fetching item details...');
    
    try {
      // Call the API to get item details
      const response = await fetch('/api/get-item-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skus: skus.map(s => s.sku) }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }

      const data = await response.json();
      
      // Process the response
      const valid: B2BItem[] = [];
      const invalid: string[] = [];
      
      // Initialize stock inputs for each variant
      const initialStockInputs: Record<string, number> = {};
      
      skus.forEach(skuObj => {
        const sku = skuObj.sku;
        const item = data.items.find((item: B2BItem) => item.sku === sku);
        
        if (item && item.variants && item.variants.length > 0) {
          valid.push(item);
          
          // Initialize stock inputs for each variant
          item.variants.forEach((variant: Variant) => {
            const key = `${item.sku}-${variant.variantCode}`;
            initialStockInputs[key] = variant.stock;
          });
        } else {
          invalid.push(sku);
        }
      });
      
      setValidItems(valid);
      setInvalidSKUs(invalid);
      setStockInputs(initialStockInputs);
      setShowValidation(true);
      
      addToast('success', 'Item details loaded successfully', [
        `${valid.length} valid items found`,
        invalid.length > 0 ? `${invalid.length} invalid items` : undefined
      ].filter(Boolean) as string[]);
    } catch (err) {
      console.error('Error fetching item details:', err);
      addToast('error', 'Failed to fetch item details', ['Please try again']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockChange = (sku: string, variantCode: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const key = `${sku}-${variantCode}`;
    
    setStockInputs(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    addToast('info', 'Saving stock data...');
    
    try {
      // Prepare the data to be saved in the required webhook format
      const webhookData = {
        transaction_date: new Date().toISOString().replace('T', ' ').replace('.', ','),
        note: "Stock update from B2B portal",
        items: validItems.flatMap(item => 
          item.variants.map(variant => {
            const key = `${item.sku}-${variant.variantCode}`;
            const stockValue = stockInputs[key] ?? 0;
            return {
              item_id: variant.jubelioItemId,
              description: `${item.sku} - ${variant.variantCode}`,
              qty_in_base: stockValue,
              unit: "PCS"
            };
          })
        )
      };

      console.log('Sending data to API:', JSON.stringify(webhookData, null, 2));

      // Call the API to save the stock data
      const response = await fetch('/api/save-stock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      const result = await response.json();
      console.log('API response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to save stock data (${response.status})`);
      }
      
      if (result.success) {
        // Clear all data after successful save
        setValidItems([]);
        setInvalidSKUs([]);
        setStockInputs({});
        setShowValidation(false);
        localStorage.removeItem('b2bSelectedSKUs');
        setSaveSuccess(true);
        
        addToast('success', 'Stock data saved successfully', [
          `${getTotalItems()} items updated`,
          `Total stock: ${getTotalStock()} units`
        ]);
      } else {
        throw new Error(result.message || 'Failed to save stock data');
      }
    } catch (err) {
      console.error('Error saving stock data:', err);
      addToast('error', 'Failed to save stock data', [err instanceof Error ? err.message : 'Please try again']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    fetchItemDetails(selectedSKUs);
  };

  const handleAddMoreItems = () => {
    setSaveSuccess(false);
    router.push('/b2b-dashboard/item-input');
  };

  const getTotalItems = () => {
    return validItems.reduce((total, item) => total + (item.variants?.length || 0), 0);
  };

  const getTotalStock = () => {
    return Object.values(stockInputs).reduce((sum, val) => sum + val, 0);
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
            key={toast.id}
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
                    <li key={index}>{detail}</li>
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
            Back to Item Input
          </button>
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">B2B Stock Management</h1>
              <p className="text-sm text-gray-600">
                Review and update stock quantities • <span className="font-medium text-primary-600">{session.user?.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        {/* Success Message */}
        {saveSuccess && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Stock Data Saved Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Your stock data has been updated in the system.
              </p>
              <button
                onClick={handleAddMoreItems}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Add More Items
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !saveSuccess && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Fetching item details from Business Central...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {validItems.length > 0 && !isLoading && !saveSuccess && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Valid SKUs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{validItems.length}</p>
                </div>
                <div className="bg-primary-100 p-3 rounded-lg">
                  <FaCheckCircle className="text-primary-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Variants</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{getTotalItems()}</p>
                </div>
                <div className="bg-primary-100 p-3 rounded-lg">
                  <FaBoxOpen className="text-primary-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Stock</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{getTotalStock()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <FaSave className="text-green-600 text-xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {showValidation && !isLoading && !saveSuccess && (invalidSKUs.length > 0 || validItems.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-5 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaInfoCircle className="mr-2 text-primary-600" />
                  Validation Summary
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {validItems.length} valid • {invalidSKUs.length} invalid
                </p>
              </div>
              <button 
                onClick={() => setShowValidation(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Valid Items */}
                {validItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="bg-green-50 border-b border-green-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-green-800 flex items-center">
                        <FaCheckCircle className="mr-2" /> Valid Items ({validItems.length})
                      </h3>
                    </div>
                    
                    <div className="p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {validItems.map(item => (
                          <div key={item.sku} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-mono font-semibold text-gray-900">{item.sku}</span>
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                {item.variants.length} variant{item.variants.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            {item.brandName && (
                              <p className="text-xs text-gray-600">{item.brandName}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Invalid Items */}
                {invalidSKUs.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="bg-red-50 border-b border-red-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-red-800 flex items-center">
                        <FaExclamationTriangle className="mr-2" /> Invalid Items ({invalidSKUs.length})
                      </h3>
                    </div>
                    
                    <div className="p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {invalidSKUs.map(sku => (
                          <div key={sku} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-mono font-semibold text-gray-900">{sku}</span>
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                                Not found
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">Item not found in system</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Details Table */}
        {!saveSuccess && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="bg-primary-100 p-2 rounded-lg mr-3">
                  <FaBoxOpen className="text-primary-600" />
                </div>
                Stock Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">Review and update stock quantities for each variant</p>
            </div>
            
            <div className="p-5">
              {validItems.length === 0 && !isLoading ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaBoxOpen className="text-gray-400 text-3xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No valid items found</h3>
                  <p className="text-sm text-gray-500 mb-4">Go back to add valid SKUs to continue</p>
                  <button
                    onClick={handleBack}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    Go to Item Input
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Variant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock to Send</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {validItems.map((item) => (
                        item.variants.map((variant, vIdx) => {
                          const key = `${item.sku}-${variant.variantCode}`;
                          
                          return (
                            <tr key={key} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <span className="font-mono font-semibold text-gray-900">
                                  {item.sku}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-medium">
                                  {variant.jubelioItemId}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                  {variant.variantCode}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="text-gray-900 font-medium">
                                  {variant.stock} units
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={stockInputs[key] ?? variant.stock}
                                  onChange={(e) => handleStockChange(item.sku, variant.variantCode, e.target.value)}
                                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {validItems.length > 0 && !saveSuccess && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{getTotalItems()}</span> variant(s) • 
                <span className="font-semibold text-gray-900 ml-1">{getTotalStock()}</span> total units
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-95 transition-all font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Save Stock Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}