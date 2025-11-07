// app/api/items/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { parseProductCode } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow superadmin and item-master to export items
    const allowedRoles = ['superadmin', 'item-master'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds, format = 'csv', statusFilter, categoryFilter } = body;

    // Build query with filters
    const conditions = [];
    
    // If specific item IDs are provided, filter by those
    if (itemIds && itemIds.length > 0) {
      conditions.push(inArray(items.id, itemIds));
    }
    
    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(items.status, statusFilter as any));
    }
    
    if (categoryFilter && categoryFilter !== 'all') {
      conditions.push(eq(items.productCategory, categoryFilter));
    }

    // Fetch items with creator information
    const itemsData = await db
      .select({
        id: items.id,
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
        totalStock: items.totalStock,
        period: items.period,
        season: items.season,
        unitOfMeasure: items.unitOfMeasure,
        status: items.status,
        createdAt: items.createdAt,
        createdByName: users.name,
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Parse product codes to get brand, division, and category names
    const itemsWithParsedData = itemsData.map(item => {
      const parsed = parseProductCode(item.productCode);
      return {
        ...item,
        brandName: parsed.brandName,
        divisionName: parsed.divisionName,
        categoryName: parsed.categoryName
      };
    });

    if (format === 'csv') {
      // Create CSV content with proper escaping
      const headers = [
        'Product Code',
        'Description',
        'Brand Code',
        'Brand Name',
        'Product Division',
        'Division Name',
        'Product Category',
        'Category Name',
        'Total Stock',
        'Period',
        'Season',
        'Unit of Measure',
        'Status',
        'Created By',
        'Created At'
      ];

      // Helper function to escape CSV fields
      const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) return '';
        const strField = String(field);
        // Escape double quotes and wrap in quotes if contains comma, newline, or quote
        if (strField.includes(',') || strField.includes('\n') || strField.includes('"')) {
          return `"${strField.replace(/"/g, '""')}"`;
        }
        return strField;
      };

      const csvContent = [
        headers.join(','),
        ...itemsWithParsedData.map(item => [
          escapeCsvField(item.productCode),
          escapeCsvField(item.description),
          escapeCsvField(item.brandCode),
          escapeCsvField(item.brandName),
          escapeCsvField(item.productDivision),
          escapeCsvField(item.divisionName),
          escapeCsvField(item.productCategory),
          escapeCsvField(item.categoryName),
          escapeCsvField(item.totalStock),
          escapeCsvField(item.period),
          escapeCsvField(item.season),
          escapeCsvField(item.unitOfMeasure),
          escapeCsvField(item.status),
          escapeCsvField(item.createdByName),
          escapeCsvField(new Date(item.createdAt).toISOString())
        ].join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="items_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'excel') {
      // Create Excel content using HTML table format
      const headers = [
        'Product Code',
        'Description',
        'Brand Code',
        'Brand Name',
        'Product Division',
        'Division Name',
        'Product Category',
        'Category Name',
        'Total Stock',
        'Period',
        'Season',
        'Unit of Measure',
        'Status',
        'Created By',
        'Created At'
      ];

      // Helper function to escape HTML
      const escapeHtml = (text: any): string => {
        if (text === null || text === undefined) return '';
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const rows = itemsWithParsedData.map(item => [
        item.productCode,
        item.description,
        item.brandCode,
        item.brandName,
        item.productDivision,
        item.divisionName,
        item.productCategory,
        item.categoryName,
        item.totalStock,
        item.period,
        item.season,
        item.unitOfMeasure,
        item.status,
        item.createdByName || '',
        new Date(item.createdAt).toISOString()
      ]);

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
          <head>
            <meta charset="utf-8">
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Items Export</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              table { 
                border-collapse: collapse; 
                width: 100%;
                font-family: Arial, sans-serif;
              }
              td, th { 
                border: 1px solid #ccc; 
                padding: 8px;
                text-align: left;
              }
              th { 
                background-color: #4472C4;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map(row => 
                  `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
                ).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="items_export_${new Date().toISOString().split('T')[0]}.xls"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting items:', error);
    return NextResponse.json({ 
      error: 'Failed to export items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}