#!/usr/bin/env node

/**
 * Test script for roles persistence fix
 * 
 * This tests that roles created/updated in the Admin page are properly saved to the database
 */

import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';
let token = null;
let userId = null;
let businessId = null;

const log = {
  info: (msg, data) => console.log(`ℹ️  ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  success: (msg, data) => console.log(`✅ ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, data) => console.error(`❌ ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  test: (msg) => console.log(`\n🧪 TEST: ${msg}\n`),
};

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    log.error('Failed to parse response', { status: res.status, text });
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  
  return data;
}

async function test() {
  try {
    log.test('Testing Roles Persistence');

    // 1. Register a test user
    log.info('1. Registering test user...');
    const testEmail = `test_${crypto.randomBytes(4).toString('hex')}@test.com`;
    const registerRes = await request('POST', '/api/register', {
      companyName: 'Test Company',
      adminName: 'Test Admin',
      email: testEmail,
      password: 'TestPassword123!',
    });
    log.success('User registered', { email: testEmail });

    // 2. Login
    log.info('2. Logging in...');
    const loginRes = await request('POST', '/api/login', {
      email: testEmail,
      password: 'TestPassword123!',
    });
    token = loginRes.token;
    log.success('Logged in, token received');

    // 3. Get current user to extract businessId
    log.info('3. Fetching current user...');
    const userRes = await request('GET', '/api/me');
    userId = userRes.id;
    businessId = userRes.business_id || userRes.businessId;
    log.success('Current user fetched', { userId, businessId });

    // 4. Create a new role
    log.info('4. Creating new role...');
    const roleId = `test_role_${crypto.randomBytes(4).toString('hex')}`;
    const createRes = await request('POST', '/api/roles', {
      id: roleId,
      name: 'Test Role',
      permissions: ['dashboard', 'pos'],
      business_id: businessId, // Send business_id
    });
    log.success('Role created', createRes);

    // 5. Verify role was saved in database
    log.info('5. Fetching all roles to verify persistence...');
    const rolesRes = await request('GET', `/api/roles?businessId=${businessId}`);
    const createdRole = rolesRes.find(r => r.id === roleId);
    
    if (!createdRole) {
      log.error('❌ FAILED: Role not found in database after creation');
      process.exit(1);
    }
    
    if (createdRole.name !== 'Test Role') {
      log.error('❌ FAILED: Role name not persisted correctly', { expected: 'Test Role', actual: createdRole.name });
      process.exit(1);
    }
    
    const perms = typeof createdRole.permissions === 'string' ? JSON.parse(createdRole.permissions) : createdRole.permissions;
    if (!Array.isArray(perms) || !perms.includes('dashboard')) {
      log.error('❌ FAILED: Permissions not persisted correctly', { expected: ['dashboard', 'pos'], actual: perms });
      process.exit(1);
    }
    
    log.success('✅ Role persisted correctly', createdRole);

    // 6. Update the role
    log.info('6. Updating role permissions...');
    const updateRes = await request('PUT', `/api/roles/${roleId}`, {
      name: 'Updated Test Role',
      permissions: ['dashboard', 'pos', 'admin'],
      business_id: businessId,
    });
    log.success('Role updated', updateRes);

    // 7. Verify update was saved
    log.info('7. Fetching roles again to verify update persistence...');
    const rolesRes2 = await request('GET', `/api/roles?businessId=${businessId}`);
    const updatedRole = rolesRes2.find(r => r.id === roleId);
    
    if (!updatedRole) {
      log.error('❌ FAILED: Updated role not found');
      process.exit(1);
    }
    
    if (updatedRole.name !== 'Updated Test Role') {
      log.error('❌ FAILED: Role name update not persisted', { expected: 'Updated Test Role', actual: updatedRole.name });
      process.exit(1);
    }
    
    const perms2 = typeof updatedRole.permissions === 'string' ? JSON.parse(updatedRole.permissions) : updatedRole.permissions;
    if (!Array.isArray(perms2) || !perms2.includes('admin')) {
      log.error('❌ FAILED: Permission update not persisted', { expected: ['dashboard', 'pos', 'admin'], actual: perms2 });
      process.exit(1);
    }
    
    log.success('✅ Role update persisted correctly', updatedRole);

    // 8. Delete the role
    log.info('8. Deleting test role...');
    const deleteRes = await request('DELETE', `/api/roles/${roleId}`);
    log.success('Role deleted', deleteRes);

    // 9. Verify deletion
    log.info('9. Verifying role deletion...');
    const rolesRes3 = await request('GET', `/api/roles?businessId=${businessId}`);
    const deletedRole = rolesRes3.find(r => r.id === roleId);
    
    if (deletedRole) {
      log.error('❌ FAILED: Deleted role still exists');
      process.exit(1);
    }
    
    log.success('✅ Role deletion verified');

    log.test('✅ ALL TESTS PASSED!');
    log.info('Roles persistence is now working correctly.');
    
  } catch (err) {
    log.error('Test failed', err.message);
    process.exit(1);
  }
}

test();
