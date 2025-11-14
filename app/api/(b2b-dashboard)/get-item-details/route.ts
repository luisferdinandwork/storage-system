import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { skus } = await request.json();
    
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ error: 'SKUs are required' }, { status: 400 });
    }

    // Prepare the body for Business Central API
    const requestBody = {
      skuListJson: JSON.stringify(skus)
    };

    // Set up the request to Business Central API
    const bcApiUrl = 'https://bc.panatradeprestasi.com:7248/UAT/ODataV4/PPItemAPI_GetItemStock?company=PNT%20LIVE';
    const username = 'lsadmin';
    const password = '$Prestasi@01$%';

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

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
      return NextResponse.json({ error: 'Failed to fetch item details' }, { status: 500 });
    }

    const data = await response.json();
    
    // The response has a stringified JSON in the 'value' field
    if (data.value && typeof data.value === 'string') {
      try {
        // Parse the stringified JSON
        const items = JSON.parse(data.value);
        
        // Transform the data to match our interface
        const transformedItems = items.map((item: any) => ({
          sku: item.itemNo,
          variants: item.variants.map((variant: any) => ({
            variantCode: variant.variantCode,
            stock: variant.stock || 0
          }))
        }));
        
        return NextResponse.json({ items: transformedItems });
      } catch (parseError) {
        console.error('Error parsing Business Central response:', parseError);
        return NextResponse.json({ error: 'Failed to parse item details' }, { status: 500 });
      }
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error('Error fetching item details:', error);
    return NextResponse.json({ error: 'Failed to fetch item details' }, { status: 500 });
  }
}