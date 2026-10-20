export interface LocationState {
  province: string;
  district: string;
}

const DISTRICTS: Record<string, string[]> = {
  kigali: [
    'Gasabo',
    'Kicukiro',
    'Nyarugenge',
  ],
  south: [
    'Gisagara',
    'Huye',
    'Kamonyi',
    'Muhanga',
    'Nyamagabe',
    'Nyanza',
    'Nyaruguru',
    'Ruhango',
  ],
  west: [
    'Karongi',
    'Ngororero',
    'Nyabihu',
    'Nyamasheke',
    'Rubavu',
    'Rusizi',
    'Rutsiro',
  ],
  north: [
    'Burera',
    'Gakenke',
    'Gicumbi',
    'Musanze',
    'Rulindo',
  ],
  east: [
    'Bugesera',
    'Gatsibo',
    'Kayonza',
    'Kirehe',
    'Ngoma',
    'Nyagatare',
    'Rwamagana',
  ],
};

export const PROVINCES = [
  'Kigali',
  'South',
  'West',
  'North',
  'East',
];

export function districtsFor(province: string): string[] {
  const key = province.toLowerCase();
  return DISTRICTS[key] ?? [];
}
