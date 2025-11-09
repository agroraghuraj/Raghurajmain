import axios from 'axios';

// API Base URL Configuration
// Dynamic API URL that works for both localhost and network access
// const getApiBaseUrl = () => {
//   // If accessing from localhost (same machine), use localhost
//   if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
//     return 'http://localhost:5000';
//   }
  
//   // If accessing from network (mobile/other devices), use the same hostname as frontend
//   // This assumes backend is running on the same machine as frontend but on port 5000
//   return `${window.location.protocol}//${window.location.hostname}:5000`;
// };

const API_BASE_URL = 'https://raghurajbackend.onrender.com';

// const API_BASE_URL = 'http://localhost:5000'; // Development only

// Debug logging for API URL
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🌐 Current location:', window.location.href);
console.log('📱 Hostname:', window.location.hostname);

// Fallback configurations for different environments
// const API_BASE_URL = 'https://saveraelectronic-backend.onrender.com'; // Production
// const API_BASE_URL = 'http://localhost:5000'; // Development only
// const API_BASE_URL = window.location.origin; // Same port as frontend

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('electromart_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Retry configuration for 429 errors
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryCondition: (error: any) => {
    return error.response?.status === 429;
  }
};

// Retry function
const retryRequest = async (config: any, retryCount = 0): Promise<any> => {
  try {
    return await apiClient(config);
  } catch (error: any) {
    if (retryConfig.retryCondition(error) && retryCount < retryConfig.maxRetries) {
      console.log(`Retrying request (${retryCount + 1}/${retryConfig.maxRetries}) after ${retryConfig.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * (retryCount + 1)));
      return retryRequest(config, retryCount + 1);
    }
    throw error;
  }
};

// Response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 429 errors with retry logic
    if (error.response?.status === 429) {
      console.log('Rate limit exceeded, attempting retry...');
      
      // Try to retry the request
      try {
        const retryResponse = await retryRequest(error.config);
        return retryResponse;
      } catch (retryError) {
        console.error('Retry failed, returning original error');
        // If retry fails, continue with original error handling
      }
    }

    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || 
                          error.response.data?.error || 
                          `HTTP ${error.response.status}: ${error.response.statusText}`;
      
      console.error(`API Error for ${error.config.url}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        fullResponse: error.response,
      });

      // Also log the actual error message for debugging
      console.error('Actual error message:', errorMessage);

      // Additional debug info for "[object Object]" issues
      if (typeof error.response.data === 'object') {
        console.error('Response data object:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Handle specific status codes
      if (error.response.status === 401) {
        // Unauthorized - clear auth data
        localStorage.removeItem('electromart_user');
        localStorage.removeItem('electromart_token');
        // Optionally redirect to login
        window.location.href = '/login';
      }
      
      // Create a detailed error object
      const detailedError = new Error(errorMessage);
      (detailedError as any).response = error.response;
      (detailedError as any).status = error.response.status;
      (detailedError as any).data = error.response.data;
      throw detailedError;
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to connect to server');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

export default apiClient;
export { API_BASE_URL };
