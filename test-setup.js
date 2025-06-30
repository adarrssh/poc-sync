const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000';

async function testBackend() {
  console.log('🧪 Testing Backend Setup...\n');

  try {
    // Test 1: Basic health check
    console.log('1. Testing basic health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: API health check
    console.log('2. Testing API health endpoint...');
    const apiHealthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ API health check passed:', apiHealthResponse.data);
    console.log('');

    // Test 3: Test CORS
    console.log('3. Testing CORS...');
    const corsResponse = await axios.options(`${API_BASE_URL}/api/auth/signup`, {
      headers: {
        'Origin': 'http://localhost:5001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('✅ CORS test passed');
    console.log('');

    console.log('🎉 All tests passed! Backend is ready.');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Create a .env file with your MongoDB URI');
    console.log('3. Start the backend: npm start');
    console.log('4. Start the frontend: npm start');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend is not running. Please start it with:');
      console.log('cd backend && npm start');
    }
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testBackend(); 