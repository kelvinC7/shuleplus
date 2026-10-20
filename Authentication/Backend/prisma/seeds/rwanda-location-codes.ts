/** Official-style district codes (01–30) keyed by normalized district name. */
export const DISTRICT_CODE_BY_NAME: Record<string, string> = {
  bugesera: '01',
  burera: '02',
  gakenke: '03',
  gasabo: '04',
  gatsibo: '05',
  gicumbi: '06',
  gisagara: '07',
  huye: '08',
  kamonyi: '09',
  karongi: '10',
  kayonza: '11',
  kicukiro: '12',
  kirehe: '13',
  muhanga: '14',
  musanze: '15',
  ngoma: '16',
  ngororero: '17',
  nyabihu: '18',
  nyagatare: '19',
  nyamagabe: '20',
  nyamasheke: '21',
  nyanza: '22',
  nyarugenge: '23',
  nyaruguru: '24',
  rubavu: '25',
  ruhango: '26',
  rulindo: '27',
  rusizi: '28',
  rutsiro: '29',
  rwamagana: '30',
};

export const PROVINCE_CODES: Record<string, string> = {
  Kigali: 'P-KGL',
  Eastern: 'P-EST',
  Northern: 'P-NTH',
  Southern: 'P-STH',
  Western: 'P-WST',
};

export const PROVINCE_NAME_MAP: Record<string, string> = {
  kigali: 'Kigali',
  eastern: 'Eastern',
  northern: 'Northern',
  southern: 'Southern',
  western: 'Western',
};

export function provinceCode(name: string): string {
  return PROVINCE_CODES[name] ?? `P-${name.slice(0, 3).toUpperCase()}`;
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function titleCaseProvince(raw: string): string {
  const key = normalizeName(raw);
  return PROVINCE_NAME_MAP[key] ?? raw.charAt(0) + raw.slice(1).toLowerCase();
}

export function districtCodeForName(name: string): string | undefined {
  return DISTRICT_CODE_BY_NAME[normalizeName(name)];
}

export interface RwandaLocationRow {
  province_name: string;
  district_name: string;
  sector_name: string;
  cell_name: string;
  village_name: string;
}
