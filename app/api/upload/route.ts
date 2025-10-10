import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('Unauthorized upload attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to upload (superadmin or item-master)
    const allowedRoles = ['superadmin', 'item-master'];
    if (!allowedRoles.includes(session.user.role)) {
      console.log('Forbidden upload attempt by user:', session.user.role);
      return NextResponse.json({ 
        error: 'Forbidden. Only superadmin and item-master can upload files' 
      }, { status: 403 });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const sku = formData.get('sku') as string; // Get SKU from form data
      
      console.log('File received:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
      console.log('SKU:', sku);
      console.log('Uploaded by:', session.user.role, '-', session.user.name);
      
      if (!file) {
        console.log('No file provided');
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        console.log('Invalid file type:', file.type);
        return NextResponse.json({ 
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' 
        }, { status: 400 });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.log('File too large:', file.size);
        return NextResponse.json({ 
          error: 'File too large. Maximum size is 5MB' 
        }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      try {
        await mkdir(uploadsDir, { recursive: true });
        console.log('Uploads directory ensured');
      } catch (error) {
        console.log('Uploads directory already exists or created');
      }

      // Generate filename using SKU if provided, otherwise use UUID
      const fileExtension = file.name.split('.').pop();
      const baseFileName = sku && sku.trim() ? sku.trim() : randomUUID();
      
      // If using SKU, add timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileName = sku 
        ? `${baseFileName}_${timestamp}.${fileExtension}` 
        : `${baseFileName}.${fileExtension}`;
      
      const filePath = join(uploadsDir, fileName);

      console.log('Saving file to:', filePath);

      // Write file to disk
      await writeFile(filePath, buffer);
      console.log('File saved successfully');

      // Return file information
      const fileInfo = {
        fileName: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${fileName}`,
        uploadedBy: session.user.name,
        uploadedAt: new Date().toISOString(),
      };

      console.log('Returning file info:', fileInfo);

      return NextResponse.json(fileInfo);
    } catch (error) {
      console.error('Error processing upload:', error);
      return NextResponse.json(
        { error: 'Failed to process file upload' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}