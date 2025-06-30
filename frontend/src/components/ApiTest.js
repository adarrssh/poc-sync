import React, { useState } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config';

const ApiTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      console.log('Testing API connection to:', API_CONFIG.url);
      
      // Test basic health endpoint
      const response = await axios.get(`${API_CONFIG.url}/api/health`);
      setTestResult(`✅ API Connection Successful!\nStatus: ${response.status}\nData: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      console.error('API Test Error:', error);
      setTestResult(`❌ API Connection Failed!\nError: ${error.message}\nStatus: ${error.response?.status}\nURL: ${error.config?.url}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">API Connection Test</h3>
      <p className="text-sm text-gray-600 mb-2">Current API URL: {API_CONFIG.url}</p>
      
      <button
        onClick={testApiConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-3 bg-white rounded border">
          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest; 