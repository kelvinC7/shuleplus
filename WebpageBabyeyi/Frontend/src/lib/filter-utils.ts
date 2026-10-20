import type { DirectoryFilters } from '@/lib/types';
import { DEFAULT_FILTERS } from '@/lib/data';

export function countActiveFilters(filters: DirectoryFilters): number {
  let n = 0;
  if (filters.name.trim()) n++;
  if (filters.provinceId) n++;
  if (filters.districtId) n++;
  if (filters.sectorId) n++;
  if (filters.level) n++;
  if (filters.type) n++;
  if (filters.curriculum) n++;
  if (filters.combination) n++;
  if (filters.gender) n++;
  if (filters.mode) n++;
  if (filters.maxFeesPct < DEFAULT_FILTERS.maxFeesPct) n++;
  return n;
}
