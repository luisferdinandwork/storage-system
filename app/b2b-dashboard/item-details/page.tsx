'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaBoxOpen, FaTrash, FaSave, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaTimes, FaArrowRight, FaSync } from 'react-icons/fa';

interface SKUItem {
  sku: string;
}

interface Variant {
  variantCode: string;
  stock: number;
}

interface B2BItem {
  sku: string;
  brandName?: string;
  divisionName?: string;
  categoryName?: string;
  variants: Variant[];
}

export default function ItemDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSKUs, setSelectedSKUs] = useState<SKUItem[]>([]);
  const [validItems, setValidItems] = useState<B2BItem[]>([]);
  const [invalidSKUs, setInvalidSKUs] = useState<string[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    
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
          item.variants.forEach((variant: { variantCode: any; }) => {
            const key = `${item.sku}-${variant.variantCode}`;
            initialStockInputs[key] = 0;
          });
        } else {
          invalid.push(sku);
        }
      });
      
      setValidItems(valid);
      setInvalidSKUs(invalid);
      setStockInputs(initialStockInputs);
      setShowValidation(true);
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError('Failed to fetch item details. Please try again.');
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
    setSaveSuccess(false);
    
    try {
      // Prepare the data to be saved
      const stockData = validItems.map(item => {
        return {
          sku: item.sku,
          variants: item.variants.map(variant => {
            const key = `${item.sku}-${variant.variantCode}`;
            return {
              variantCode: variant.variantCode,
              stock: stockInputs[key] || 0
            };
          })
        };
      });

      // Call the API to save the stock data
      const response = await fetch('/api/save-stock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: stockData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save stock data');
      }

      const result = await response.json();
      
      if (result.success) {
        setSaveSuccess(true);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to save stock data');
      }
    } catch (err) {
      console.error('Error saving stock data:', err);
      setError('Failed to save stock data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    // In a real app, you would save the valid items and proceed
    console.log('Proceeding with valid items:', validItems);
    // router.push('/next-page');
  };

  const handleRetry = () => {
    fetchItemDetails(selectedSKUs);
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
            Back to Item Input
          </button>
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                B2B Item Stock Management
              </h1>
              <p className="text-gray-600">
                Welcome, <span className="font-semibold text-primary-600">{session.user?.name}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 animate-fade-in">
                  <FaCheckCircle className="mr-2" />
                  <span className="text-sm font-medium">Saved successfully!</span>
                </div>
              )}
              
              <button
                onClick={handleSave}
                disabled={isSaving || validItems.length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg p-4 flex items-start bg-red-50 border border-red-200 text-red-800">
            <FaExclamationTriangle className="mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-2 flex items-center text-sm font-medium text-red-700 hover:text-red-900"
              >
                <FaSync className="mr-1" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 rounded-lg p-8 bg-white shadow-md">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600">Fetching item details from Business Central...</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {validItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Valid SKUs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{validItems.length}</p>
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
                  <p className="text-3xl font-bold text-gray-900 mt-1">{getTotalItems()}</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                  <FaBoxOpen className="text-emerald-600 text-2xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Stock to Send</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {getTotalStock()}
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <FaSave className="text-amber-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {showValidation && !isLoading && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Validation Results</h2>
              <button 
                onClick={() => setShowValidation(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Valid Items */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <FaCheckCircle className="mr-2" /> Valid SKUs ({validItems.length})
                  </h3>
                </div>
                
                <div className="p-6">
                  {validItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No valid SKUs found</p>
                  ) : (
                    <div className="space-y-4">
                      {validItems.map(item => (
                        <div key={item.sku} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-semibold">{item.sku}</span>
                              {item.brandName && (
                                <span className="text-gray-500 text-sm ml-2">{item.brandName}</span>
                              )}
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">
                              Valid
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.divisionName && <div>Division: {item.divisionName}</div>}
                            {item.categoryName && <div>Category: {item.categoryName}</div>}
                            <div className="mt-2">
                              <span className="font-medium">Variants:</span> {item.variants.map(v => v.variantCode).join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Invalid Items */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <FaExclamationTriangle className="mr-2" /> Invalid SKUs ({invalidSKUs.length})
                  </h3>
                </div>
                
                <div className="p-6">
                  {invalidSKUs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No invalid SKUs found</p>
                  ) : (
                    <div className="space-y-4">
                      {invalidSKUs.map(sku => (
                        <div key={sku} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-semibold">{sku}</span>
                            </div>
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Invalid
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            This SKU was not found in our system
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleContinue}
                disabled={validItems.length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Continue with Valid Items
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaBoxOpen className="mr-2" /> Stock Details
            </h2>
          </div>
          
          <div className="p-6">
            {validItems.length === 0 && !isLoading ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBoxOpen className="text-gray-400 text-4xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No valid items</h3>
                <p className="text-gray-500 mb-6">Go back to the Item Input page to add valid SKUs.</p>
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Go to Item Input
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU-Variant</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Variant Code</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock to Send</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validItems.map((item) => (
                      item.variants.map((variant) => {
                        const key = `${item.sku}-${variant.variantCode}`;
                        
                        return (
                          <tr key={key} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              <div className="flex items-center">
                                <div className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-mono">
                                  {item.sku}-{variant.variantCode}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                                {variant.variantCode}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                                {variant.stock} units
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                min="0"
                                value={stockInputs[key] || variant.stock}
                                onChange={(e) => handleStockChange(item.sku, variant.variantCode, e.target.value)}
                                className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
      </div>
    </div>
  );
}