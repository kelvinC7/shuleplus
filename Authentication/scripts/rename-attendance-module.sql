-- One-time: align platform_modules row with Digital Attendance branding
UPDATE platform_modules
SET
  name = 'Digital Attendance',
  short_name = 'Digital',
  description = 'Entry and exit logs, devices, and live presence.'
WHERE slug = 'attendance';
