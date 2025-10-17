// app/api/items/import/template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow superadmin and item-master to access the template
    const allowedRoles = ['superadmin', 'item-master'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Template headers
    const headers = [
      'Product Code',
      'Description',
      'Total Stock',
      'Period',
      'Season',
      'Unit of Measure',
      'Condition',
      'Condition Notes',
      'Location'
    ];

    // Example data rows
    const exampleRows = [
      [
        'SPE110000001',
        'TEMPO SHIPYARD/EGRET/DOESKIN Lifestyle Shoes',
        '35',
        '25Q1',
        'SS',
        'PRS',
        'excellent',
        'Brand new in box',
        'Storage 1'
      ],
      [
        'SPE110100002',
        'TEMPO SHADED SPRUCE/EGRET/DOESKIN Football Shoes',
        '12',
        '25Q1',
        'SS',
        'PRS',
        'good',
        'Minor scuff marks on sole',
        'Storage 2'
      ],
      [
        'PIE210200003',
        'FORTE INDIA INK/EGRET/DOESKIN Futsal Shoes',
        '67',
        '24Q4',
        'FW',
        'PRS',
        'good',
        'Display model with slight wear',
        'Storage 3'
      ],
      [
        'SPE120000004',
        'Training Jersey Set - Blue',
        '100',
        '25Q1',
        'SS',
        'PCS',
        'excellent',
        '',
        ''
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
          'Content-Disposition': 'attachment; filename="items_import_template.csv"',
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
                    <x:Name>Items Import Template</x:Name>
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
            <h2>📦 Items Import Template</h2>
            
            <div class="instructions">
              <strong>Instructions:</strong>
              <ol>
                <li>Fill in your item data below the example rows</li>
                <li>You can delete the example rows (highlighted in gray)</li>
                <li>Required fields are marked with * in the descriptions below</li>
                <li>Save this file and upload it to the import function</li>
              </ol>
            </div>

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

            <div class="field-desc">
              <h3>📋 Field Descriptions</h3>
              <ul>
                <li>
                  <strong>Product Code *</strong><br>
                  12-character code format: XXX-YY-ZZ-NNNNN<br>
                  Examples: SPE110000001 (Specs Footwear Lifestyle), PIE210200001 (Piero Footwear Futsal)
                </li>
                <li>
                  <strong>Description *</strong><br>
                  Detailed item description (e.g., "TEMPO SHIPYARD/EGRET/DOESKIN Lifestyle Shoes")
                </li>
                <li>
                  <strong>Total Stock *</strong><br>
                  Number of items in stock (must be a whole number)
                </li>
                <li>
                  <strong>Period *</strong><br>
                  Period code (e.g., 25Q1, 24Q4, 25Q2)
                </li>
                <li>
                  <strong>Season *</strong><br>
                  Season code: SS (Spring/Summer) or FW (Fall/Winter)
                </li>
                <li>
                  <strong>Unit of Measure *</strong><br>
                  PCS (Pieces) or PRS (Pairs)
                </li>
                <li>
                  <strong>Condition *</strong><br>
                  Item condition: excellent, good, fair, or poor
                </li>
                <li>
                  <strong>Condition Notes</strong><br>
                  Optional notes about the item's condition (e.g., "Brand new in box", "Minor scratches")
                </li>
                <li>
                  <strong>Location</strong><br>
                  Storage location: Storage 1, Storage 2, Storage 3, or leave empty
                </li>
              </ul>
            </div>

            <div class="note">
              <strong>⚠️ Important Notes:</strong>
              <ul>
                <li>Fields marked with * are required</li>
                <li>Product codes must be unique (no duplicates)</li>
                <li>The product code format determines the brand, division, and category automatically</li>
                <li>All imported items will have status "Pending Approval"</li>
                <li>When saving for import, convert this file to CSV format</li>
              </ul>
            </div>
          </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': 'attachment; filename="items_import_template.xls"',
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid format. Use csv or excel' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating import template:', error);
    return NextResponse.json({ 
      error: 'Failed to generate import template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}