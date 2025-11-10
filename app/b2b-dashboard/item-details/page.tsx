'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaBoxOpen, FaTrash, FaSave, FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { sampleB2BItems, B2BItem, Variant } from '@/data/b2b-item-data';

export default function ItemDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<B2BItem[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Load selected items from localStorage on mount
  useEffect(() => {
    const storedItems = localStorage.getItem('b2bSelectedItems');
    if (storedItems) {
      const items = JSON.parse(storedItems);
      setSelectedItems(items);
      
      // Initialize stock inputs with current stock values
      const initialInputs: Record<string, number> = {};
      items.forEach((item: B2BItem) => {
        item.variants.forEach((variant: Variant) => {
          initialInputs[`${item.sku}-${variant.size}`] = variant.stock;
        });
      });
      setStockInputs(initialInputs);
    }
  }, []);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  const handleStockChange = (sku: string, size: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const key = `${sku}-${size}`;
    
    // Find the current stock for this variant
    const item = selectedItems.find(item => item.sku === sku);
    if (!item) return;
    
    const variant = item.variants.find(v => v.size === size);
    if (!variant) return;
    
    // Validate the input
    if (numValue > variant.stock) {
      // Set validation error
      setValidationErrors(prev => ({ ...prev, [key]: true }));
      return; // Don't update the state if invalid
    } else {
      // Clear validation error if it exists
      if (validationErrors[key]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    }
    
    setStockInputs(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const handleSave = () => {
    // Check for validation errors before saving
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Saving stock data:', stockInputs);
      setIsSaving(false);
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1000);
  };

  const handleRemoveVariant = (sku: string, size: string) => {
    const updatedItems = [...selectedItems];
    const itemIndex = updatedItems.findIndex(item => item.sku === sku);
    
    if (itemIndex !== -1) {
      // Remove the specific variant
      updatedItems[itemIndex].variants = updatedItems[itemIndex].variants.filter(
        variant => variant.size !== size
      );
      
      // If no variants left, remove the entire item
      if (updatedItems[itemIndex].variants.length === 0) {
        updatedItems.splice(itemIndex, 1);
      }
      
      setSelectedItems(updatedItems);
      localStorage.setItem('b2bSelectedItems', JSON.stringify(updatedItems));
      
      // Remove stock input for this variant
      const updatedInputs = { ...stockInputs };
      delete updatedInputs[`${sku}-${size}`];
      setStockInputs(updatedInputs);
      
      // Remove validation error if it exists
      if (validationErrors[`${sku}-${size}`]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${sku}-${size}`];
          return newErrors;
        });
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getTotalItems = () => {
    return selectedItems.reduce((total, item) => total + item.variants.length, 0);
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
              
              {Object.keys(validationErrors).length > 0 && (
                <div className="flex items-center bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200">
                  <FaExclamationTriangle className="mr-2" />
                  <span className="text-sm font-medium">
                    {Object.keys(validationErrors).length} invalid stock value(s)
                  </span>
                </div>
              )}
              
              <button
                onClick={handleSave}
                disabled={isSaving || selectedItems.length === 0 || Object.keys(validationErrors).length > 0}
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

        {/* Stats Cards */}
        {selectedItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total SKUs</p>
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
                    {Object.values(stockInputs).reduce((sum, val) => sum + val, 0)}
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <FaSave className="text-amber-600 text-2xl" />
                </div>
              </div>
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
            {selectedItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBoxOpen className="text-gray-400 text-4xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No items selected</h3>
                <p className="text-gray-500 mb-6">Go to the Item Input page to add items.</p>
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU-Size</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock to Send</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedItems.map((item) => (
                      item.variants.map((variant) => {
                        const key = `${item.sku}-${variant.size}`;
                        const hasError = validationErrors[key];
                        
                        return (
                          <tr key={key} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              <div className="flex items-center">
                                <div className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-mono">
                                  {item.sku}-{variant.size}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                                {variant.stock} units
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={variant.stock}
                                  value={stockInputs[key] || 0}
                                  onChange={(e) => handleStockChange(item.sku, variant.size, e.target.value)}
                                  className={`w-24 px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                                    hasError 
                                      ? 'border-red-500 bg-red-50' 
                                      : 'border-gray-200'
                                  }`}
                                />
                                {hasError && (
                                  <div className="ml-2 text-red-500" title="Value exceeds current stock">
                                    <FaExclamationTriangle />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleRemoveVariant(item.sku, variant.size)}
                                className="inline-flex items-center justify-center w-10 h-10 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={`Remove ${item.sku}-${variant.size}`}
                              >
                                <FaTrash />
                              </button>
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