import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sku } = await request.json();
    
    console.log('API received SKU for validation:', sku); // Add this log
    
    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }

    // Prepare the body for Business Central API
    const requestBody = {
      skuListJson: JSON.stringify([sku])
    };

    // Set up the request to Business Central API
    const bcApiUrl = 'https://bc.panatradeprestasi.com:7248/UAT/ODataV4/PPItemAPI_GetItemStock?company=PNT%20LIVE';
    const username = 'lsadmin';
    const password = '$Prestasi@01$%';

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    console.log('Sending to Business Central:', requestBody); // Add this log

    const response = await fetch(bcApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('Business Central API error:', response.status, response.statusText);
      return NextResponse.json({ exists: false, stock: undefined });
    }

    const data = await response.json();
    console.log('Business Central response:', data); // Add this log
    
    // The response has a stringified JSON in the 'value' field
    if (data.value && typeof data.value === 'string') {
      try {
        // Parse the stringified JSON
        const items = JSON.parse(data.value);
        
        if (Array.isArray(items) && items.length > 0) {
          // Find the item with the matching SKU
          const item = items.find(i => i.itemNo === sku);
          
          if (item) {
            // Calculate total stock from all variants
            let totalStock = 0;
            if (item.variants && Array.isArray(item.variants)) {
              totalStock = item.variants.reduce((sum: any, variant: { stock: any; }) => sum + (variant.stock || 0), 0);
            }
            
            return NextResponse.json({ 
              exists: true, 
              stock: totalStock,
              variants: item.variants.map((variant: any) => ({
                variantCode: variant.variantCode,
                stock: variant.stock || 0,
                jubelioItemId: variant.jubelioItemId // Add this field
              }))
            });
          }
        }
      } catch (parseError) {
        console.error('Error parsing Business Central response:', parseError);
      }
    }

    return NextResponse.json({ exists: false, stock: undefined });
  } catch (error) {
    console.error('Error validating SKU:', error);
    return NextResponse.json({ exists: false, stock: undefined }, { status: 500 });
  }
}