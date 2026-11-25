// Phone number rules for every country (sign-up and the admin "Add customer" form).
// Each row: [two-letter code, country, calling code, shortest number, longest number]
// "number" = the digits AFTER the calling code, without the first 0 (+880 1712-345678 -> 1712345678).
// The lengths follow the ITU numbering plans. Countries with a well known mobile format also get
// a PATTERN below, so for example a Bangladesh number must be a real mobile number (+880 1XXXXXXXXX).
// The website shows this list in the "Country code" box (GET /api/auth/countries).

const COUNTRIES = [
  ['BD', 'Bangladesh', '880', 10, 10],
  ['AF', 'Afghanistan', '93', 9, 9],
  ['AL', 'Albania', '355', 8, 9],
  ['DZ', 'Algeria', '213', 8, 9],
  ['AD', 'Andorra', '376', 6, 9],
  ['AO', 'Angola', '244', 9, 9],
  ['AG', 'Antigua and Barbuda', '1', 10, 10],
  ['AR', 'Argentina', '54', 10, 11],
  ['AM', 'Armenia', '374', 8, 8],
  ['AU', 'Australia', '61', 9, 9],
  ['AT', 'Austria', '43', 4, 13],
  ['AZ', 'Azerbaijan', '994', 9, 9],
  ['BS', 'Bahamas', '1', 10, 10],
  ['BH', 'Bahrain', '973', 8, 8],
  ['BB', 'Barbados', '1', 10, 10],
  ['BY', 'Belarus', '375', 9, 10],
  ['BE', 'Belgium', '32', 8, 9],
  ['BZ', 'Belize', '501', 7, 7],
  ['BJ', 'Benin', '229', 8, 10],
  ['BT', 'Bhutan', '975', 7, 8],
  ['BO', 'Bolivia', '591', 8, 8],
  ['BA', 'Bosnia and Herzegovina', '387', 8, 9],
  ['BW', 'Botswana', '267', 7, 8],
  ['BR', 'Brazil', '55', 10, 11],
  ['BN', 'Brunei', '673', 7, 7],
  ['BG', 'Bulgaria', '359', 8, 9],
  ['BF', 'Burkina Faso', '226', 8, 8],
  ['BI', 'Burundi', '257', 8, 8],
  ['KH', 'Cambodia', '855', 8, 9],
  ['CM', 'Cameroon', '237', 9, 9],
  ['CA', 'Canada', '1', 10, 10],
  ['CV', 'Cape Verde', '238', 7, 7],
  ['CF', 'Central African Republic', '236', 8, 8],
  ['TD', 'Chad', '235', 8, 8],
  ['CL', 'Chile', '56', 9, 9],
  ['CN', 'China', '86', 10, 11],
  ['CO', 'Colombia', '57', 10, 10],
  ['KM', 'Comoros', '269', 7, 7],
  ['CG', 'Congo', '242', 9, 9],
  ['CD', 'Congo (DR)', '243', 9, 9],
  ['CR', 'Costa Rica', '506', 8, 8],
  ['CI', "Cote d'Ivoire", '225', 10, 10],
  ['HR', 'Croatia', '385', 8, 9],
  ['CU', 'Cuba', '53', 8, 8],
  ['CY', 'Cyprus', '357', 8, 8],
  ['CZ', 'Czechia', '420', 9, 9],
  ['DK', 'Denmark', '45', 8, 8],
  ['DJ', 'Djibouti', '253', 8, 8],
  ['DM', 'Dominica', '1', 10, 10],
  ['DO', 'Dominican Republic', '1', 10, 10],
  ['EC', 'Ecuador', '593', 8, 9],
  ['EG', 'Egypt', '20', 9, 10],
  ['SV', 'El Salvador', '503', 8, 8],
  ['GQ', 'Equatorial Guinea', '240', 9, 9],
  ['ER', 'Eritrea', '291', 7, 7],
  ['EE', 'Estonia', '372', 7, 8],
  ['SZ', 'Eswatini', '268', 8, 8],
  ['ET', 'Ethiopia', '251', 9, 9],
  ['FJ', 'Fiji', '679', 7, 7],
  ['FI', 'Finland', '358', 5, 12],
  ['FR', 'France', '33', 9, 9],
  ['GA', 'Gabon', '241', 7, 8],
  ['GM', 'Gambia', '220', 7, 7],
  ['GE', 'Georgia', '995', 9, 9],
  ['DE', 'Germany', '49', 6, 13],
  ['GH', 'Ghana', '233', 9, 9],
  ['GR', 'Greece', '30', 10, 10],
  ['GD', 'Grenada', '1', 10, 10],
  ['GT', 'Guatemala', '502', 8, 8],
  ['GN', 'Guinea', '224', 9, 9],
  ['GW', 'Guinea-Bissau', '245', 7, 9],
  ['GY', 'Guyana', '592', 7, 7],
  ['HT', 'Haiti', '509', 8, 8],
  ['HN', 'Honduras', '504', 8, 8],
  ['HK', 'Hong Kong', '852', 8, 8],
  ['HU', 'Hungary', '36', 8, 9],
  ['IS', 'Iceland', '354', 7, 9],
  ['IN', 'India', '91', 10, 10],
  ['ID', 'Indonesia', '62', 9, 12],
  ['IR', 'Iran', '98', 10, 10],
  ['IQ', 'Iraq', '964', 8, 10],
  ['IE', 'Ireland', '353', 7, 9],
  ['IL', 'Israel', '972', 8, 9],
  ['IT', 'Italy', '39', 6, 11],
  ['JM', 'Jamaica', '1', 10, 10],
  ['JP', 'Japan', '81', 9, 10],
  ['JO', 'Jordan', '962', 8, 9],
  ['KZ', 'Kazakhstan', '7', 10, 10],
  ['KE', 'Kenya', '254', 9, 9],
  ['KI', 'Kiribati', '686', 5, 8],
  ['KW', 'Kuwait', '965', 8, 8],
  ['KG', 'Kyrgyzstan', '996', 9, 9],
  ['LA', 'Laos', '856', 8, 10],
  ['LV', 'Latvia', '371', 8, 8],
  ['LB', 'Lebanon', '961', 7, 8],
  ['LS', 'Lesotho', '266', 8, 8],
  ['LR', 'Liberia', '231', 7, 9],
  ['LY', 'Libya', '218', 8, 9],
  ['LI', 'Liechtenstein', '423', 7, 9],
  ['LT', 'Lithuania', '370', 8, 8],
  ['LU', 'Luxembourg', '352', 4, 11],
  ['MO', 'Macao', '853', 8, 8],
  ['MG', 'Madagascar', '261', 9, 9],
  ['MW', 'Malawi', '265', 7, 9],
  ['MY', 'Malaysia', '60', 7, 10],
  ['MV', 'Maldives', '960', 7, 7],
  ['ML', 'Mali', '223', 8, 8],
  ['MT', 'Malta', '356', 8, 8],
  ['MH', 'Marshall Islands', '692', 7, 7],
  ['MR', 'Mauritania', '222', 8, 8],
  ['MU', 'Mauritius', '230', 7, 8],
  ['MX', 'Mexico', '52', 10, 10],
  ['FM', 'Micronesia', '691', 7, 7],
  ['MD', 'Moldova', '373', 8, 8],
  ['MC', 'Monaco', '377', 8, 9],
  ['MN', 'Mongolia', '976', 8, 8],
  ['ME', 'Montenegro', '382', 8, 9],
  ['MA', 'Morocco', '212', 9, 9],
  ['MZ', 'Mozambique', '258', 8, 9],
  ['MM', 'Myanmar', '95', 7, 10],
  ['NA', 'Namibia', '264', 8, 9],
  ['NR', 'Nauru', '674', 7, 7],
  ['NP', 'Nepal', '977', 8, 10],
  ['NL', 'Netherlands', '31', 9, 9],
  ['NZ', 'New Zealand', '64', 8, 10],
  ['NI', 'Nicaragua', '505', 8, 8],
  ['NE', 'Niger', '227', 8, 8],
  ['NG', 'Nigeria', '234', 8, 10],
  ['KP', 'North Korea', '850', 8, 10],
  ['MK', 'North Macedonia', '389', 8, 8],
  ['NO', 'Norway', '47', 8, 8],
  ['OM', 'Oman', '968', 8, 8],
  ['PK', 'Pakistan', '92', 10, 10],
  ['PW', 'Palau', '680', 7, 7],
  ['PS', 'Palestine', '970', 8, 9],
  ['PA', 'Panama', '507', 7, 8],
  ['PG', 'Papua New Guinea', '675', 7, 8],
  ['PY', 'Paraguay', '595', 9, 9],
  ['PE', 'Peru', '51', 8, 9],
  ['PH', 'Philippines', '63', 8, 10],
  ['PL', 'Poland', '48', 9, 9],
  ['PT', 'Portugal', '351', 9, 9],
  ['PR', 'Puerto Rico', '1', 10, 10],
  ['QA', 'Qatar', '974', 8, 8],
  ['RO', 'Romania', '40', 9, 9],
  ['RU', 'Russia', '7', 10, 10],
  ['RW', 'Rwanda', '250', 9, 9],
  ['KN', 'Saint Kitts and Nevis', '1', 10, 10],
  ['LC', 'Saint Lucia', '1', 10, 10],
  ['VC', 'Saint Vincent and the Grenadines', '1', 10, 10],
  ['WS', 'Samoa', '685', 5, 7],
  ['SM', 'San Marino', '378', 6, 10],
  ['ST', 'Sao Tome and Principe', '239', 7, 7],
  ['SA', 'Saudi Arabia', '966', 9, 9],
  ['SN', 'Senegal', '221', 9, 9],
  ['RS', 'Serbia', '381', 8, 9],
  ['SC', 'Seychelles', '248', 7, 7],
  ['SL', 'Sierra Leone', '232', 8, 8],
  ['SG', 'Singapore', '65', 8, 8],
  ['SK', 'Slovakia', '421', 9, 9],
  ['SI', 'Slovenia', '386', 8, 8],
  ['SB', 'Solomon Islands', '677', 5, 7],
  ['SO', 'Somalia', '252', 7, 9],
  ['ZA', 'South Africa', '27', 9, 9],
  ['KR', 'South Korea', '82', 9, 10],
  ['SS', 'South Sudan', '211', 9, 9],
  ['ES', 'Spain', '34', 9, 9],
  ['LK', 'Sri Lanka', '94', 9, 9],
  ['SD', 'Sudan', '249', 9, 9],
  ['SR', 'Suriname', '597', 6, 7],
  ['SE', 'Sweden', '46', 7, 10],
  ['CH', 'Switzerland', '41', 9, 9],
  ['SY', 'Syria', '963', 8, 9],
  ['TW', 'Taiwan', '886', 8, 9],
  ['TJ', 'Tajikistan', '992', 9, 9],
  ['TZ', 'Tanzania', '255', 9, 9],
  ['TH', 'Thailand', '66', 8, 9],
  ['TL', 'Timor-Leste', '670', 7, 8],
  ['TG', 'Togo', '228', 8, 8],
  ['TO', 'Tonga', '676', 5, 7],
  ['TT', 'Trinidad and Tobago', '1', 10, 10],
  ['TN', 'Tunisia', '216', 8, 8],
  ['TR', 'Turkiye', '90', 10, 10],
  ['TM', 'Turkmenistan', '993', 8, 8],
  ['TV', 'Tuvalu', '688', 5, 6],
  ['UG', 'Uganda', '256', 9, 9],
  ['UA', 'Ukraine', '380', 9, 9],
  ['AE', 'United Arab Emirates', '971', 8, 9],
  ['GB', 'United Kingdom', '44', 10, 10],
  ['US', 'United States', '1', 10, 10],
  ['UY', 'Uruguay', '598', 8, 8],
  ['UZ', 'Uzbekistan', '998', 9, 9],
  ['VU', 'Vanuatu', '678', 5, 7],
  ['VA', 'Vatican City', '39', 6, 11],
  ['VE', 'Venezuela', '58', 10, 10],
  ['VN', 'Vietnam', '84', 9, 10],
  ['YE', 'Yemen', '967', 7, 9],
  ['ZM', 'Zambia', '260', 9, 9],
  ['ZW', 'Zimbabwe', '263', 9, 9],
];

// Stricter checks for countries with a clear format (the digits after the calling code)
const PATTERNS = {
  BD: { re: /^1[3-9][0-9]{8}$/, example: '1712345678', hint: 'a Bangladeshi mobile number: +880 1XXXXXXXXX (013 to 019)' },
  IN: { re: /^[6-9][0-9]{9}$/, example: '9812345678', hint: 'an Indian mobile number starting with 6, 7, 8 or 9' },
  PK: { re: /^3[0-9]{9}$/, example: '3001234567', hint: 'a Pakistani mobile number: +92 3XXXXXXXXX' },
  NP: { re: /^9[78][0-9]{8}$|^[1-8][0-9]{6,8}$/, example: '9812345678', hint: 'a Nepali number' },
  LK: { re: /^7[0-9]{8}$|^[1-9][0-9]{8}$/, example: '712345678', hint: 'a Sri Lankan number' },
  US: { re: /^[2-9][0-9]{2}[2-9][0-9]{6}$/, example: '2025550123', hint: 'a US number: area code + 7 digits' },
  CA: { re: /^[2-9][0-9]{2}[2-9][0-9]{6}$/, example: '4165550123', hint: 'a Canadian number: area code + 7 digits' },
  GB: { re: /^[1-9][0-9]{9}$/, example: '7400123456', hint: 'a UK number: 10 digits after +44 (mobile 7XXXXXXXXX)' },
  AE: { re: /^5[0-9]{8}$|^[2-9][0-9]{7}$/, example: '501234567', hint: 'a UAE number (mobile 5XXXXXXXX)' },
  SA: { re: /^5[0-9]{8}$|^1[0-9]{8}$/, example: '512345678', hint: 'a Saudi number (mobile 5XXXXXXXX)' },
  MY: { re: /^1[0-9]{8,9}$|^[3-9][0-9]{7,8}$/, example: '123456789', hint: 'a Malaysian number' },
  SG: { re: /^[689][0-9]{7}$/, example: '81234567', hint: 'a Singapore number starting with 6, 8 or 9' },
};

/** The list for the website: [{ code, name, dial, min, max, example }] (Bangladesh first, then A to Z) */
export const COUNTRY_LIST = COUNTRIES.map(([code, name, dial, min, max]) => ({
  code,
  name,
  dial,
  min,
  max,
  example: PATTERNS[code]?.example || null, // a sample number for the box (only where the format is clear)
}));

const BY_CODE = new Map(COUNTRY_LIST.map((c) => [c.code, c]));

/**
 * Checks one phone number for one country.
 * countryCode: 'BD', 'IN' ...   number: what the person typed after the country code (spaces, dashes
 * and a first 0 are fine: "01712-345678" -> "1712345678").
 * Returns { ok: true, phone: '+8801712345678' } or { ok: false, message }.
 */
export function checkPhone(countryCode, number) {
  const country = BY_CODE.get(String(countryCode || '').toUpperCase());
  if (!country) return { ok: false, message: 'Please choose the country of the phone number' };

  let digits = String(number ?? '').replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]+$/.test(digits)) return { ok: false, message: 'The phone number can only have digits' };
  digits = digits.replace(/^\+/, '');
  // Typed with the calling code again (8801712...) or with the first 0 (01712...): take them off
  if (digits.startsWith(country.dial) && digits.length > country.max) digits = digits.slice(country.dial.length);
  // (Italy and the Vatican keep the 0: it is part of their numbers)
  if (!['IT', 'VA'].includes(country.code)) digits = digits.replace(/^0+/, '');

  const pattern = PATTERNS[country.code];
  const lengthOk = digits.length >= country.min && digits.length <= country.max;
  if (!lengthOk || (pattern && !pattern.re.test(digits))) {
    const size = country.min === country.max ? `${country.min}` : `${country.min} to ${country.max}`;
    return {
      ok: false,
      message: pattern
        ? `Enter ${pattern.hint}`
        : `A ${country.name} number has ${size} digits after +${country.dial}`,
    };
  }
  return { ok: true, phone: `+${country.dial}${digits}` };
}

/**
 * The same check for a number that already has its "+calling code" (e.g. "+8801712345678"),
 * like the ones saved in the database. A number without "+" is read as a Bangladeshi number.
 */
export function checkFullPhone(phone) {
  const text = String(phone ?? '').replace(/[\s\-().]/g, '');
  if (!text.startsWith('+')) return checkPhone('BD', text);
  // The longest calling code that fits wins (+1 268 ... is Antigua, not the USA, but both use the +1 rules here)
  const matches = COUNTRY_LIST.filter((c) => text.slice(1).startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length);
  if (matches.length === 0) return { ok: false, message: 'Unknown country calling code' };
  let lastError = null;
  for (const country of matches) {
    const result = checkPhone(country.code, text.slice(1 + country.dial.length));
    if (result.ok) return result;
    lastError = lastError || result;
  }
  return lastError;
}
