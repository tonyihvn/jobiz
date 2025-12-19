#!/usr/bin/env node
// Test SMS endpoint
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const PHONE = '2347067973091';
const MESSAGE = 'Thank you';

console.log('=== SMS Test ===');
console.log('API URL:', API_URL);
console.log('Phone:', PHONE);
console.log('Message:', MESSAGE);
console.log('');

(async () => {
  try {
    console.log('Sending test SMS...');
    const response = await fetch(`${API_URL}/api/test-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: PHONE,
        message: MESSAGE
      })
    });

    const data = await response.json();
    
    console.log('');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('');
      console.log('✅ SMS sent successfully!');
    } else {
      console.log('');
      console.log('❌ Failed to send SMS:', data.error);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
