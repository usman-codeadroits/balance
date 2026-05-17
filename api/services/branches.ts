import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Area, Branch } from '../types';

const filterActiveAreas = (items: any[]): Area[] =>
  items.filter((a) => !a.status || a.status === 'active' || a.status === 1 || a.status === '1' || a.status === true);

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
  const response = await apiClient.get<any>(
    `${API_ENDPOINTS.BRANCHES}/${branchId}/areas`
  );
  const raw: any[] =
    Array.isArray(response) ? response :
    Array.isArray(response?.data) ? response.data :
    [];
  return filterActiveAreas(raw);
};

export const getAllAreas = async (): Promise<Area[]> => {
  try {
    const response = await apiClient.get<any>(API_ENDPOINTS.AREAS);
    // Handle multiple response shapes: { success, data: [] }, { areas: [] }, or direct []
    const raw: any[] =
      Array.isArray(response) ? response :
      Array.isArray(response?.data) ? response.data :
      Array.isArray(response?.areas) ? response.areas :
      [];
    // Per API docs, areas endpoint returns no status field — return all items
    if (raw.length > 0) return raw as Area[];
  } catch {
    // fallback: collect areas from all branches
  }
  const branches = await getBranches();
  const areaArrays = await Promise.all(branches.map((b) => getBranchAreas(b.id).catch(() => [])));
  const seen = new Set<string>();
  const combined: Area[] = [];
  areaArrays.flat().forEach((area) => {
    const key = String(area.id);
    if (!seen.has(key)) { seen.add(key); combined.push(area); }
  });
  return combined;
};
