// app/api/clearance-items/import/template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow storage-master, storage-master-manager, and superadmin to access the template
    const allowedRoles = ['storage-master', 'storage-master-manager', 'superadmin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Template headers for clearance items
    const headers = [
      'Product Code',
      'In Clearance',
    ];

    // Example data rows for clearance items
    const exampleRows = [
      [
        'SPE110000001',
        '10',
      ],
      [
        'SPE110100002',
        '5',
      ],
      [
        'PIE210200003',
        '15',
      ],
      [
        'SPE120000004',
        '20',
      ]
    ];

    if (format === 'csv') {
      // Helper to escape CSV fields
      const escapeCsvField = (field: string): string => {
        if (field.includes(',') || field.includes('\n') || field.includes('"')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvContent = [
        headers.map(escapeCsvField).join(','),
        ...exampleRows.map(row => row.map(escapeCsvField).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clearance_items_import_template.csv"',
        },
      });
    } else if (format === 'excel') {
      // Helper to escape HTML
      const escapeHtml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

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
                    <x:Name>Clearance Items Import Template</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              h2 {
                color: #2c3e50;
                margin-bottom: 10px;
              }
              .instructions {
                background-color: #e8f4f8;
                border-left: 4px solid #3498db;
                padding: 15px;
                margin: 20px 0;
              }
              table { 
                border-collapse: collapse; 
                width: 100%;
                margin: 20px 0;
              }
              td, th { 
                border: 1px solid #ccc; 
                padding: 10px;
                text-align: left;
              }
              th { 
                background-color: #4472C4;
                color: white;
                font-weight: bold;
              }
              .example { 
                background-color: #f9f9f9;
              }
              .field-desc {
                margin: 20px 0;
              }
              .field-desc h3 {
                color: #2c3e50;
                margin-bottom: 10px;
              }
              .field-desc ul {
                list-style-type: none;
                padding: 0;
              }
              .field-desc li {
                padding: 8px;
                margin: 5px 0;
                background-color: #f8f9fa;
                border-left: 3px solid #3498db;
              }
              .field-desc strong {
                color: #2c3e50;
              }
              .note {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${exampleRows.map(row => 
                  `<tr class="example">${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
                ).join('')}
                <tr>${headers.map(() => '<td></td>').join('')}</tr>
                <tr>${headers.map(() => '<td></td>').join('')}</tr>
                <tr>${headers.map(() => '<td></td>').join('')}</tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': 'attachment; filename="clearance_items_import_template.xls"',
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid format. Use csv or excel' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating clearance import template:', error);
    return NextResponse.json({ 
      error: 'Failed to generate clearance import template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}