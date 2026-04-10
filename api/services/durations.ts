/**
 * Durations API Service
 * Handles all duration-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Duration, DurationsResponse } from '../types';

/**
 * Fetch all durations
 */
export const getDurations = async (): Promise<Duration[]> => {
  try {
    const response = await apiClient.get<DurationsResponse>(
      API_ENDPOINTS.DURATIONS
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format');
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single duration by ID
 */
export const getDurationById = async (id: number): Promise<Duration | null> => {
  try {
    const response = await apiClient.get<DurationsResponse>(
      API_ENDPOINTS.DURATIONS
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format');
    }

    const duration = response.data.find((d: Duration) => d.id === id);
    return duration || null;
  } catch (error) {
    throw error;
  }
};

