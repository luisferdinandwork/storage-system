// components/clearance/ScannedFormUploadModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessages } from '@/hooks/use-messages';
import { Upload, FileImage, CheckCircle, AlertCircle } from 'lucide-react';

interface ScannedFormUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formNumber: string;
  onUploadSuccess: () => void;
}

export function ScannedFormUploadModal({
  isOpen,
  onClose,
  formId,
  formNumber,
  onUploadSuccess
}: ScannedFormUploadModalProps) {
  const { addMessage } = useMessages();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setUploadError('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed');
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        setUploadError('File too large. Maximum size is 10MB');
        return;
      }
      
      setFile(selectedFile);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('formId', formId);

      const response = await fetch('/api/clearance-forms/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('success');
        addMessage('success', 'Scanned form uploaded successfully', 'Success');
        onUploadSuccess();
        setTimeout(() => {
          onClose();
          setFile(null);
          setUploadStatus('idle');
        }, 1500);
      } else {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Failed to upload file');
        setUploadStatus('error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('An unexpected error occurred during upload');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setUploadStatus('idle');
    setUploadError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Scanned Clearance Form</DialogTitle>
          <DialogDescription>
            Upload the scanned form #{formNumber} after completing the physical verification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {uploadStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-700">Upload Successful!</p>
              <p className="text-sm text-gray-500 mt-1">The scanned form has been uploaded successfully.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                {file ? (
                  <div className="flex flex-col items-center">
                    <FileImage className="h-12 w-12 text-blue-500 mb-2" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setFile(null)}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop your file here, or click to browse
                    </p>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                        Select File
                      </div>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                    />
                  </>
                )}
              </div>
              
              {uploadError && (
                <div className="flex items-center text-red-500 text-sm mt-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {uploadError}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                <p>Accepted formats: JPEG, PNG, WebP, PDF (max 10MB)</p>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          {uploadStatus !== 'success' && (
            <>
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}