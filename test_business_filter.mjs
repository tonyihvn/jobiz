#!/usr/bin/env node
/**
 * Test script to verify that products and services are properly filtered by business ID
 */

import http from 'http';
import https from 'https';
import { config } from 'dotenv';

config();

const API_BASE = process.env.VITE_API_URL || 'http://localhost:5000';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Products/Services Business Filtering\n');
  console.log(`API Base: ${API_BASE}\n`);

  try {
    // 1. Login as regular user
    console.log('📝 Step 1: Logging in as regular user...');
    const loginRes = await request('POST', '/api/login', {
      email: 'admin@jobiz.ng',
      password: 'admin'
    });
    
    if (loginRes.status !== 200) {
      console.log('❌ Login failed:', loginRes);
      return;
    }
    
    const token = loginRes.data.token;
    console.log('✅ Login successful. Token:', token.substring(0, 20) + '...');

    // 2. Get current user info
    console.log('\n📝 Step 2: Fetching current user info...');
    const userRes = await request('GET', '/api/me', null, token);
    
    if (userRes.status !== 200) {
      console.log('❌ Failed to get user:', userRes);
      return;
    }
    
    const user = userRes.data;
    console.log('✅ User fetched:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Name: ${user.name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Business ID: ${user.businessId}`);
    console.log(`   - Is Super Admin: ${user.is_super_admin}`);

    // 3. Get products without business ID param
    console.log('\n📝 Step 3: Fetching products (no businessId param)...');
    const productsRes1 = await request('GET', '/api/products', null, token);
    console.log(`✅ Response Status: ${productsRes1.status}`);
    console.log(`   Count: ${Array.isArray(productsRes1.data) ? productsRes1.data.length : 0}`);
    if (Array.isArray(productsRes1.data) && productsRes1.data.length > 0) {
      console.log('   Sample:', {
        id: productsRes1.data[0].id,
        name: productsRes1.data[0].name,
        business_id: productsRes1.data[0].business_id
      });
    }

    // 4. Get products with business ID param
    console.log('\n📝 Step 4: Fetching products (with businessId param)...');
    const productsRes2 = await request('GET', `/api/products?businessId=${user.businessId}`, null, token);
    console.log(`✅ Response Status: ${productsRes2.status}`);
    console.log(`   Count: ${Array.isArray(productsRes2.data) ? productsRes2.data.length : 0}`);
    if (Array.isArray(productsRes2.data) && productsRes2.data.length > 0) {
      console.log('   Sample:', {
        id: productsRes2.data[0].id,
        name: productsRes2.data[0].name,
        business_id: productsRes2.data[0].business_id
      });
    }

    // 5. Get services without business ID param
    console.log('\n📝 Step 5: Fetching services (no businessId param)...');
    const servicesRes1 = await request('GET', '/api/services', null, token);
    console.log(`✅ Response Status: ${servicesRes1.status}`);
    console.log(`   Count: ${Array.isArray(servicesRes1.data) ? servicesRes1.data.length : 0}`);
    if (Array.isArray(servicesRes1.data) && servicesRes1.data.length > 0) {
      console.log('   Sample:', {
        id: servicesRes1.data[0].id,
        name: servicesRes1.data[0].name,
        business_id: servicesRes1.data[0].business_id
      });
    }

    // 6. Get services with business ID param
    console.log('\n📝 Step 6: Fetching services (with businessId param)...');
    const servicesRes2 = await request('GET', `/api/services?businessId=${user.businessId}`, null, token);
    console.log(`✅ Response Status: ${servicesRes2.status}`);
    console.log(`   Count: ${Array.isArray(servicesRes2.data) ? servicesRes2.data.length : 0}`);
    if (Array.isArray(servicesRes2.data) && servicesRes2.data.length > 0) {
      console.log('   Sample:', {
        id: servicesRes2.data[0].id,
        name: servicesRes2.data[0].name,
        business_id: servicesRes2.data[0].business_id
      });
    }

    // 7. Summary
    console.log('\n📊 Summary:');
    console.log(`   Products (no filter): ${Array.isArray(productsRes1.data) ? productsRes1.data.length : 0}`);
    console.log(`   Products (with filter): ${Array.isArray(productsRes2.data) ? productsRes2.data.length : 0}`);
    console.log(`   Services (no filter): ${Array.isArray(servicesRes1.data) ? servicesRes1.data.length : 0}`);
    console.log(`   Services (with filter): ${Array.isArray(servicesRes2.data) ? servicesRes2.data.length : 0}`);

    if (Array.isArray(productsRes1.data) && productsRes1.data.length > 0) {
      console.log('\n✅ SUCCESS: Products are available in the database!');
    } else {
      console.log('\n⚠️ WARNING: No products found. Check that demo products were seeded.');
    }

    if (Array.isArray(servicesRes1.data) && servicesRes1.data.length > 0) {
      console.log('✅ SUCCESS: Services are available in the database!');
    } else {
      console.log('⚠️ WARNING: No services found. Check that demo services were seeded.');
    }

  } catch (err) {
    console.error('❌ Error during test:', err.message);
  }
}

runTests();
