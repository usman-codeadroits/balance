/**
 * Base API Client
 * Handles common API functionality like error handling, timeouts, etc.
 */

import { API_CONFIG } from './config';
import type { ApiError } from './types';

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.defaultHeaders = API_CONFIG.HEADERS;
  }

  /**
   * Get authorization headers (can be extended for token-based auth)
   */
  private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('authToken');
    
    return {
      ...this.defaultHeaders,
      ...customHeaders,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }
    return {
      message: 'An unknown error occurred',
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(
    endpoint: string,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: await this.getHeaders(customHeaders),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(
    endpoint: string,
    data: unknown,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: await this.getHeaders(customHeaders),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Try to extract a meaningful error message
        let errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        
        // If there are validation errors, include them
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorMessages = Object.values(errorData.errors).flat();
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('. ');
          }
        }
        
        // Create error with full message and response data
        const error = new Error(errorMessage);
        (error as any).response = errorData;
        (error as any).status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    endpoint: string,
    data: unknown,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: await this.getHeaders(customHeaders),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(
    endpoint: string,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: await this.getHeaders(customHeaders),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw this.handleError(error);
    }
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

