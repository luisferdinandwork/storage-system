// app/api/clearance-forms/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { clearanceForms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('Clearance form upload API called');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('Unauthorized upload attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to upload
    const allowedRoles = ['storage-master', 'storage-master-manager', 'superadmin'];
    if (!allowedRoles.includes(session.user.role)) {
      console.log('Forbidden upload attempt by user:', session.user.role);
      return NextResponse.json({ 
        error: 'Forbidden. Only storage masters and superadmin can upload clearance forms' 
      }, { status: 403 });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const formId = formData.get('formId') as string;
      
      console.log('File received:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
      console.log('Form ID:', formId);
      console.log('Uploaded by:', session.user.role, '-', session.user.name);
      
      if (!file) {
        console.log('No file provided');
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!formId) {
        console.log('No form ID provided');
        return NextResponse.json({ error: 'No form ID provided' }, { status: 400 });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        console.log('Invalid file type:', file.type);
        return NextResponse.json({ 
          error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed' 
        }, { status: 400 });
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        console.log('File too large:', file.size);
        return NextResponse.json({ 
          error: 'File too large. Maximum size is 10MB' 
        }, { status: 400 });
      }

      // Check if the clearance form exists and is in approved status
      const clearanceForm = await db.query.clearanceForms.findFirst({
        where: eq(clearanceForms.id, formId),
      });

      if (!clearanceForm) {
        console.log('Clearance form not found:', formId);
        return NextResponse.json({ error: 'Clearance form not found' }, { status: 404 });
      }

      if (clearanceForm.status !== 'approved') {
        console.log('Clearance form not in approved status:', clearanceForm.status);
        return NextResponse.json({ 
          error: 'Clearance form must be in approved status' 
        }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'clearance-forms');
      try {
        await mkdir(uploadsDir, { recursive: true });
        console.log('Clearance forms directory ensured');
      } catch (error) {
        console.log('Clearance forms directory already exists or created');
      }

      // Generate filename
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `scanned-form-${formId}-${timestamp}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);
      const publicPath = `/clearance-forms/${fileName}`;

      console.log('Saving file to:', filePath);

      // Write file to disk
      await writeFile(filePath, buffer);
      console.log('File saved successfully');

      // Update clearance form with scanned form path
      console.log('Updating clearance form with scanned form path:', publicPath);
      const updateResult = await db
        .update(clearanceForms)
        .set({
          scannedFormPath: publicPath,
          updatedAt: new Date(),
        })
        .where(eq(clearanceForms.id, formId));

      console.log('Update result:', updateResult);

      // Verify the update was successful
      const updatedForm = await db.query.clearanceForms.findFirst({
        where: eq(clearanceForms.id, formId),
      });

      if (!updatedForm?.scannedFormPath) {
        console.error('Failed to update clearance form with scanned form path');
        return NextResponse.json({ 
          error: 'Failed to update clearance form with scanned form path' 
        }, { status: 500 });
      }

      console.log('Clearance form updated successfully with scanned form path:', updatedForm.scannedFormPath);

      // Return file information
      const fileInfo = {
        fileName: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: publicPath,
        formId: formId,
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