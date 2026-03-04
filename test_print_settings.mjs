import fetch from 'node-fetch';

async function testPrintSettings() {
  try {
    console.log('Testing Print Settings Save...\n');
    
    // Test data
    const testSettings = {
      name: 'Test Business',
      motto: 'Test Motto',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@example.com',
      logoUrl: null,
      logoAlign: 'left',
      logoHeight: 80,
      headerImageUrl: null,
      headerImageHeight: 100,
      footerImageUrl: null,
      footerImageHeight: 60,
      footerImageTopMargin: 0,
      watermarkImageUrl: null,
      watermarkAlign: 'center',
      signatureUrl: null,
      vatRate: 0,
      currency: '$',
      defaultLocationId: null,
      loginRedirects: {},
      landingContent: {},
      invoiceNotes: 'Test invoice notes',
      openReceiptsInSameWindow: true,
      thermalPrinterWidth: '50mm'
    };
    
    console.log('Test payload:');
    console.log(JSON.stringify({
      openReceiptsInSameWindow: testSettings.openReceiptsInSameWindow,
      thermalPrinterWidth: testSettings.thermalPrinterWidth
    }, null, 2));
    
    // Simulate the API call
    console.log('\n✓ Dataset prepared for testing');
    console.log('Note: To fully test, you need to:');
    console.log('1. Login to the application');
    console.log('2. Go to Settings page');
    console.log('3. Scroll to "Print Settings" section');
    console.log('4. Toggle "Open Receipts & Invoices in Same Window"');
    console.log('5. Select thermal printer width (50mm or 80mm)');
    console.log('6. Click "Save System Settings"');
    console.log('7. Check browser console for "POST /api/settings received data" log');
    console.log('8. Refresh the page to verify settings are persisted');
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testPrintSettings();
