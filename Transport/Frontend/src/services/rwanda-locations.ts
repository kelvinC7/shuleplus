import { api, type ApiEnvelope } from '@/services/api';

export interface RwandaLocationNode {
  id: string;
  name: string;
  code?: string | null;
}

export const rwandaLocations = {
  provinces: () => api.get<ApiEnvelope<RwandaLocationNode[]>>('/locations/provinces'),
  districts: (provinceId: string) =>
    api.get<ApiEnvelope<RwandaLocationNode[]>>(`/locations/provinces/${provinceId}/districts`),
  sectors: (districtId: string) =>
    api.get<ApiEnvelope<RwandaLocationNode[]>>(`/locations/districts/${districtId}/sectors`),
  cells: (sectorId: string) =>
    api.get<ApiEnvelope<RwandaLocationNode[]>>(`/locations/sectors/${sectorId}/cells`),
  villages: (cellId: string) =>
    api.get<ApiEnvelope<RwandaLocationNode[]>>(`/locations/cells/${cellId}/villages`),
};
