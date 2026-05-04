import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Area, Branch } from '../types';

export const getBranches = async (): Promise<Branch[]> => {
  const response = await apiClient.get<{ success: boolean; data: Branch[] }>(
    API_ENDPOINTS.BRANCHES
  );
  if (response && response.data && Array.isArray(response.data)) {
    return response.data.filter((b: Branch) => b.status === 'active');
  }
  return [];
};

export const getBranchAreas = async (branchId: number): Promise<Area[]> => {
  const response = await apiClient.get<{ success: boolean; data: Area[] }>(
    `${API_ENDPOINTS.BRANCHES}/${branchId}/areas`
  );
  if (response && response.data && Array.isArray(response.data)) {
    return response.data.filter((a: Area) => a.status === 'active');
  }
  return [];
};
