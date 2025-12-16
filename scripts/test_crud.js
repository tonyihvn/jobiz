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

    log('Creating a supplier...');
    const sup = { name: 'Test Supplier', contact_person: 'Bob', phone: '123', email: 'sup@test.com', address: 'Nowhere' };
    let r = await fetch(base + '/api/suppliers', { method: 'POST', headers, body: JSON.stringify(sup) });
    console.log('supplier status', r.status); const supj = await r.json(); console.log(supj);

    log('Creating a location...');
    const loc = { id: 'loc_' + Date.now().toString(), name: 'Main Store', address: 'HQ' };
    r = await fetch(base + '/api/locations', { method: 'POST', headers, body: JSON.stringify(loc) }); console.log('location', await r.json());

    log('Creating a product...');
    const prod = { id: 'prod_' + Date.now().toString(), name: 'Widget', category: 'General', price: 9.99, stock: 0, unit: 'pcs' };
    r = await fetch(base + '/api/products', { method: 'POST', headers, body: JSON.stringify(prod) }); console.log('product create', await r.json());

    log('Creating a service...');
    const svc = { id: 'svc_' + Date.now().toString(), name: 'Photo Studio Hour', categoryName: 'Services', categoryGroup: 'RENTING', description: 'Hourly studio rental', price: 40.0, unit: 'hr' };
    r = await fetch(base + '/api/services', { method: 'POST', headers, body: JSON.stringify(svc) }); console.log('service create', r.status, await r.json());
    log('Listing services...');
    r = await fetch(base + '/api/services', { headers }); console.log('services list', r.status, await r.json());

    const productId = prod.id;
    const locationId = loc.id;
    const supplierId = supj.id || supj.id || null;

    log('Increasing stock...');
    r = await fetch(base + '/api/stock/increase', { method: 'POST', headers, body: JSON.stringify({ productId, locationId, qty: 10, supplierId, batchNumber: 'BATCH-001' }) });
    console.log('stock increase', r.status, await r.json());

    log('Getting stock history...');
    r = await fetch(base + '/api/stock/history/' + productId, { headers }); console.log('history', r.status); console.log(await r.json());

    log('Creating transaction record...');
    const tx = { account_head: 'Inventory', type: 'Inflow', amount: 99.9, particulars: 'Received stock', paid_by: 'Vendor', received_by: 'Warehouse' };
    r = await fetch(base + '/api/transactions', { method: 'POST', headers, body: JSON.stringify(tx) }); console.log('tx', r.status, await r.json());

    log('TEST SCRIPT COMPLETE');
  } catch (e) {
    console.error('Test failed', e);
    process.exit(1);
  }
})();
