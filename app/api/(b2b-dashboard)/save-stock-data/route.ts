import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export async function POST(request: NextRequest) {
  try {
    // The request body is already in the correct webhook format
    const webhookData = await request.json();
    
    if (!webhookData.items || !Array.isArray(webhookData.items) || webhookData.items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    // Log the data being sent for debugging
    console.log('Sending to webhook:', JSON.stringify(webhookData, null, 2));

    // The token provided
    const token = '663mHju05LNdMq0qx6l2iSEulVoeDDdB';
    const webhookUrl = 'https://8stgn.pri.co.id/webhook/jubelio-event-stock-update-uat-pnt';

    // Use Node.js https module instead of fetch to handle SSL certificate issues
    const webhookResponse = await new Promise<{statusCode?: number, data: string}>((resolve, reject) => {
      const url = new URL(webhookUrl);
      const postData = JSON.stringify(webhookData);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${token}`,
          'X-Mirror-Token': token,
        },
        // Ignore SSL certificate validation
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('Webhook response status:', res.statusCode);
          console.log('Webhook response body:', data);
          resolve({ statusCode: res.statusCode, data });
        });
      });

      req.on('error', (error) => {
        console.error('Webhook request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    if (!webhookResponse.statusCode || webhookResponse.statusCode >= 400) {
      console.error('Webhook error:', webhookResponse.statusCode);
      return NextResponse.json({ 
        error: 'Failed to send data to webhook',
        status: webhookResponse.statusCode,
        response: webhookResponse.data
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Stock data sent to webhook successfully',
      webhookResponse: webhookResponse.data
    });
  } catch (error) {
    console.error('Error processing stock data:', error);
    return NextResponse.json({ 
      error: 'Failed to process stock data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}