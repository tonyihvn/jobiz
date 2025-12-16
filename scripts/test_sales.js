(async () => {
  const base = 'http://localhost:3001';
  function log(...a){ console.log(...a); }
  try {
    // wait for server
    const waitFor = async () => {
      for (let i=0;i<30;i++){
        try { const r = await fetch(base + '/api/'); return; } catch(e){ await new Promise(r=>setTimeout(r,1000)); }
      }
    };
    await waitFor();
  } catch(e){}

  try {
    log('Logging in as super admin...');
    const loginRes = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'super@omnisales.com', password: 'super' }) });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) { console.error('Login failed', loginJson); process.exit(1); }
    const token = loginJson.token;
    log('Got token');

    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

    // Create a location
    const loc = { id: 'loc_sale_' + Date.now().toString(), name: 'Sale Store', address: 'HQ' };
    let r = await fetch(base + '/api/locations', { method: 'POST', headers, body: JSON.stringify(loc) });
    const locRes = await r.json();
    log('location create', locRes);

    // Create a product
    const prod = { id: 'prod_sale_' + Date.now().toString(), name: 'SaleWidget', category: 'General', price: 5.5, stock: 0, unit: 'pcs' };
    r = await fetch(base + '/api/products', { method: 'POST', headers, body: JSON.stringify(prod) });
    const prodRes = await r.json();
    log('product create', prodRes);

    // Increase stock at location
    const productId = prod.id;
    const locationId = loc.id;
    log('Increasing stock...');
    r = await fetch(base + '/api/stock/increase', { method: 'POST', headers, body: JSON.stringify({ productId, locationId, qty: 5, batchNumber: 'SALE-BATCH' }) });
    const inc = await r.json();
    log('stock increase', inc);

    // Create sale: buy 2 units
    const items = [{ id: productId, quantity: 2, price: prod.price, isService: false }];
    const saleBody = { items, subtotal: 2 * prod.price, vat: 0, total: 2 * prod.price, customerId: null, paymentMethod: 'Cash', locationId };
    log('Posting sale...');
    r = await fetch(base + '/api/sales', { method: 'POST', headers, body: JSON.stringify(saleBody) });
    const saleRes = await r.json();
    log('sale response', r.status, saleRes);

    // Fetch sales list
    r = await fetch(base + '/api/sales', { headers });
    const salesList = await r.json();
    log('sales list length', Array.isArray(salesList) ? salesList.length : 'N/A');
    if (Array.isArray(salesList) && salesList.length > 0) {
      log('latest sale', salesList[0]);
    }

    // Check product aggregated stock
    r = await fetch(base + '/api/products', { headers });
    const prods = await r.json();
    const found = (prods || []).find(p => p.id === productId);
    log('product after sale', found);

    log('SALES TEST COMPLETE');
  } catch (e) {
    console.error('Test failed', e);
    process.exit(1);
  }
})();
