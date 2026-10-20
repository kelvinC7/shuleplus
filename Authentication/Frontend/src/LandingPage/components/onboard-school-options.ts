export const A_LEVEL_COMBINATIONS = [
  'PCM',
  'PCB',
  'MCB',
  'MPC',
  'MPG',
  'BCG',
  'MCG',
  'MCE',
  'HEL',
  'HGL',
  'HEG',
  'LEG',
  'MEG',
  'PEM',
  'EFK',
  'EKK',
] as const;

export const TVET_TRADES = [
  'Building Construction',
  'Masonry',
  'Carpentry',
  'Plumbing',
  'Public Works',
  'Land Surveying',
  'Painting and Decoration',
  'Software Development',
  'Computer Systems and Architecture',
  'Networking and Internet Technologies',
  'Multimedia Production',
  'Automobile Technology',
  'Electrical Technology',
  'Domestic Electricity',
  'Electronics Services',
  'Solar Energy Technology',
  'Welding and Fabrication',
  'Manufacturing',
  'Culinary Arts',
  'Food and Beverage Operations',
  'Tourism',
  'Front Office and Housekeeping',
  'Accounting',
  'Fashion Design',
  'Tailoring',
  'Hairdressing and Beauty Therapy',
  'Fine and Plastic Arts',
  'Graphic Arts',
  'Crop Production',
  'Animal Health',
  'Food Processing',
] as const;

export const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const;

export function buildYearOptions(start = 1960) {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= start; y -= 1) years.push(y);
  return years;
}
