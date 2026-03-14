// Debugging utilities for authentication issues
import { storageService } from '@/services/storage';
import { apiClient } from '@/services/api/index';
import { getApiUrl } from '@/config/api';

export const debugAuth = {
  // Decode JWT token (basic decoder, no verification)
  decodeJWT(token: string) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { error: 'Invalid JWT format' };
      }
      
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return {
        payload,
        isExpired: payload.exp ? Date.now() / 1000 > payload.exp : false,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
      };
    } catch (error) {
      return { error: 'Failed to decode JWT', details: error };
    }
  },

  // Clear all authentication data
  async clearAllAuth() {
    console.log('🗑️ DEBUG: Clearing all authentication data...');
    await storageService.forceClearAll();
    apiClient.resetTokenStatus();
    console.log('✅ All auth data cleared');
    
  },

  // Check current auth status
  async checkAuthStatus() {
    console.log('🔍 DEBUG: Checking current auth status...');
    
    const token = await storageService.getAuthToken();
    const user = await storageService.getUserData();
    const merchant = await storageService.getMerchantData();
    
    console.log('Token exists:', !!token);
    console.log('User data exists:', !!user);
    console.log('Merchant data exists:', !!merchant);
    
    if (token) {
      console.log('Token preview:', token.substring(0, 20) + '...');
      const decoded = this.decodeJWT(token);
      console.log('Token decoded:', decoded);
    }
    
    return { token: !!token, user: !!user, merchant: !!merchant };
  },

  // Test token validation with backend
  async testTokenValidation() {
    console.log('🧪 DEBUG: Testing token validation...');
    const token = await storageService.getAuthToken();
    
    if (!token) {
      console.log('❌ No token to test');
      return;
    }

    console.log('🧪 Testing token:', token.substring(0, 30) + '...');
    const decoded = this.decodeJWT(token);
    console.log('🧪 Token decoded locally:', decoded);

    try {
      // Make a simple authenticated request to test token
      const response = await fetch(getApiUrl('merchant/dashboard/metrics'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🧪 Token test response status:', response.status);
      console.log('🧪 Token test response headers:', Object.fromEntries(response.headers));
      
      const responseData = await response.json();
      console.log('🧪 Token test response body:', responseData);
      
      if (response.status === 401) {
        console.log('❌ Token is indeed invalid according to backend');
        console.log('🔍 This means the backend auth middleware is rejecting the token');
      } else {
        console.log('✅ Token is valid according to backend');
      }
      
      return { status: response.status, data: responseData };
    } catch (error) {
      console.error('🧪 Token test failed:', error);
      return { error };
    }
  },
  
  // Test full login flow
  async testLoginFlow(email: string, password: string) {
    console.log('🧪 DEBUG: Testing full login flow...');
    
    try {
      // Step 1: Clear all existing auth data
      await this.clearAllAuth();
      
      // Step 2: Make login request
      const loginResponse = await fetch(getApiUrl('merchant/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      console.log('🧪 Login response status:', loginResponse.status);
      const loginData = await loginResponse.json();
      console.log('🧪 Login response data:', loginData);
      
      if (loginResponse.status === 200 && loginData.success) {
        const token = loginData.data.token;
        console.log('🧪 Received token:', token.substring(0, 30) + '...');
        
        // Step 3: Test the token immediately
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        
        const testResult = await fetch(getApiUrl('merchant/dashboard/metrics'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🧪 Immediate token test status:', testResult.status);
        const testData = await testResult.json();
        console.log('🧪 Immediate token test data:', testData);
        
        return {
          loginSuccess: true,
          tokenValid: testResult.status === 200,
          token,
          loginData,
          testData
        };
      } else {
        return {
          loginSuccess: false,
          loginData
        };
      }
    } catch (error) {
      console.error('🧪 Login flow test failed:', error);
      return { error };
    }
  },

  // Log current storage contents (for debugging)
  async logStorageContents() {
    console.log('📁 DEBUG: Current storage contents...');
    
    try {
      const token = await storageService.getAuthToken();
      const user = await storageService.getUserData();
      const merchant = await storageService.getMerchantData();
      
      console.log('Auth Token:', token ? `${token.substring(0, 10)}...` : 'null');
      console.log('User Data:', user);
      console.log('Merchant Data:', merchant);
    } catch (error) {
      console.error('Error reading storage:', error);
    }
  }
};

// Make it available globally for debugging
if (__DEV__) {
  (global as any).debugAuth = debugAuth;
  console.log('🔧 Debug auth utilities available as global.debugAuth');
}
