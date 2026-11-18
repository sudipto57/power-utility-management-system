/**
 * Power Utility Management System — Electricity Survey tools (version 3)
 * ----------------------------------------------------------------------
 * The form is LINEAR: every person sees Step 1 -> 2 -> 3 -> 4 -> 5 in order.
 * Nothing is skipped, so no section ever looks "missing".
 *
 * Functions you can run (toolbar: choose the function, then Run):
 *   fixSurveyForm()        - puts the form into the clean 5-step layout (same link, answers kept).
 *                            Safe to run again: if the form is already right, nothing moves.
 *   rebuildDatabaseSheet() - re-cleans all answers (also runs by itself after every answer).
 *   refreshSheets()        - rebuilds the Dashboard and Field Guide tabs.
 *
 * The first version of this script (which built the form) is kept in the project
 * folder as docs/data-collection/Code_v1_builder.gs.
 */

// ===================================================================
// 1. SETTINGS — change these if you like
// ===================================================================
const CONFIG = {
  formTitle: '⚡ Electricity Survey',
  sheetTitle: 'Power Utility Management System — Survey Responses',
  // Rough average price of 1 unit (kWh) in Taka, used ONLY to turn
  // "I pay about Tk 1,000 a month" into an estimated number of units.
  takaPerUnit: 8,
  // Number prefixes for rows coming from the survey (kept different from
  // the app's own CUST- / MET- / REQ- numbers so they never clash).
  customerPrefix: 'SVY-C',
  meterPrefix: 'SVY-M',
  requestPrefix: 'SVY-R',
};

// ===================================================================
// 2. QUESTION TITLES — the form AND the sheet both use these names.
// ===================================================================
const Q = {
  consent: 'Do you agree to share your answers for our university project?',
  name: 'Your name',
  phone: 'Mobile number',
  email: 'Email',
  division: 'Division',
  area: 'Area / Thana / Upazila',
  use: 'Where is this electricity connection used?',
  provider: 'Which company supplies your electricity?',
  meterType: 'What kind of meter do you have?',
  phase: 'Single phase or three phase?',
  since: 'How long have you had this connection?',
  people: 'How many people use this connection?',
  appliances: 'Which of these do you use?',
  billAccount: 'Account / Customer No (from bill)',
  billMeter: 'Meter No (from bill)',
  billPrev: 'Previous reading (kWh)',
  billPres: 'Present reading (kWh)',
  billMonth: 'Which month is this bill for?',
  billAmount: 'Total amount on the bill (Tk)',
  billPaid: 'Is this bill paid?',
  ppMeter: 'Meter No (prepaid)',
  ppLastAmount: 'Last recharge amount (Tk)',
  ppLastWhen: 'When was your last recharge?',
  ppKwh: 'Total reading on the meter screen (kWh)',
  estLevel: 'Which one sounds like your home or shop?',
  monthly: 'About how much do you pay for electricity in a month?',
  payMethod: 'How do you usually pay or recharge?',
  payOnTime: 'Do you usually pay on time?',
  problems: 'In the last 3 months, which problems did you face?',
  outage: 'How often does the power go off?',
  story: 'Tell us about your biggest electricity problem',
  rating: 'Overall, how happy are you with your electricity service?',
};

// Old title of the monthly-cost question (fixSurveyForm renames it to Q.monthly)
const OLD = {
  ppMonthly: 'About how much do you recharge in a month?',
};

// ===================================================================
// 3. ANSWER CHOICES the dashboard counts exactly as written
// ===================================================================
const OPT = {
  divisions: ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'],
  money: ['Under Tk 500', 'Tk 500–1,000', 'Tk 1,000–2,000', 'Tk 2,000–3,500', 'Tk 3,500–5,000', 'Over Tk 5,000'],
  outage: ['Rarely', 'Once or twice a week', 'Almost every day', 'Many times a day'],
};

// Section titles (one per step) and the two sub-headings inside Step 3
const STEP = {
  s1: ['Step 1 of 5 · About you', 'Just the basics.'],
  s2: ['Step 2 of 5 · Your electricity connection', ''],
  s3: ['Step 3 of 5 · Bill & meter details', 'Fill ONLY the part that matches your meter and leave the other part empty. Every box on this page is optional.'],
  s4: ['Step 4 of 5 · Monthly usage', 'Two quick taps. Your best guess is perfect.'],
  s5: ['Step 5 of 5 · Payments & service', 'Last step!'],
};
const HDR = {
  bill: ['🧾 Postpaid meter — copy from your paper bill', 'Skip this part if you have a prepaid meter.'],
  prepaid: ['💳 Prepaid meter — look at the meter or the recharge SMS', 'Skip this part if you get a monthly paper bill.'],
};

// The two step pictures the repair places (already in your Google Drive)
const IMG = {
  step3: ['survey_05_step3_v2.png', 'Bill & Meter Details'],
  step4: ['survey_06_step4_v2.png', 'Monthly Usage'],
};

// Key words that tell the pictures apart (matched against each picture's title)
const PICTURES = {
  welcome: ['smarter', 'welcome'],
  about: ['about you'],
  connection: ['electricity connection'],
  meterTypes: ['meter types'],
  billGuide: ['paper bill'],
  prepaidGuide: ['prepaid meter'],
  usage: ['estimate'],
  payments: ['payments'],
  problems: ['complaints', 'problems'],
};

// ===================================================================
// 4. SMALL FORM HELPERS
// ===================================================================
function pictureBlob_(fileName) {
  const files = DriveApp.getFilesByName(fileName);
  return files.hasNext() ? files.next().getBlob() : null;
}

// Makes a question required or optional, whatever kind of question it is
function setRequired_(item, flag) {
  const T = FormApp.ItemType;
  const t = item.getType();
  if (t === T.TEXT) item.asTextItem().setRequired(flag);
  else if (t === T.PARAGRAPH_TEXT) item.asParagraphTextItem().setRequired(flag);
  else if (t === T.MULTIPLE_CHOICE) item.asMultipleChoiceItem().setRequired(flag);
  else if (t === T.CHECKBOX) item.asCheckboxItem().setRequired(flag);
  else if (t === T.LIST) item.asListItem().setRequired(flag);
  else if (t === T.SCALE) item.asScaleItem().setRequired(flag);
}

// ===================================================================
// 5. REPAIR THE FORM  (safe to run more than once)
//    Same form, same link, answers kept. Your own wording and answer
//    choices are NOT touched. It:
//    • puts every question and picture on its own step, in order,
//    • makes every section "continue to the next section" (no skipping),
//    • makes the Step 3 boxes optional (people fill only their own part),
//    • moves the monthly-cost question to Step 4 so everybody answers it,
//    • turns off the automatic "Email" box at the top (Email is asked in Step 1),
//    • rebuilds the Dashboard and the database tabs.
//    If the form does not look the way this script expects, it stops
//    BEFORE changing anything and says what it could not find.
// ===================================================================
function fixSurveyForm() {
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  const T = FormApp.ItemType;

  // ---- 1. Read every item ONE time (asking Google again and again is very slow) ----
  const all = form.getItems().map(function (it) {
    return { item: it, type: it.getType(), title: norm_(it.getTitle()) };
  });
  const ofType = function (type) { return all.filter(function (x) { return x.type === type; }); };
  const pages = ofType(T.PAGE_BREAK);
  const images = ofType(T.IMAGE);
  const headers = ofType(T.SECTION_HEADER);
  const questions = all.filter(function (x) {
    return x.type !== T.PAGE_BREAK && x.type !== T.IMAGE && x.type !== T.SECTION_HEADER;
  });

  // ---- 2. Find each part. Anything not found exactly once is written to "trouble". ----
  const trouble = [];
  const pick = function (list, test, label) {
    const hits = list.filter(test);
    if (hits.length !== 1) { trouble.push(label + ' (found ' + hits.length + ', need 1)'); return null; }
    return hits[0].item;
  };
  const hasWord = function (title, words) {
    return words.some(function (w) { return title.indexOf(w) >= 0; });
  };

  const q = {};
  Object.keys(Q).forEach(function (k) {
    const want = norm_(Q[k]);
    const old = k === 'monthly' ? norm_(OLD.ppMonthly) : null;
    q[k] = pick(questions, function (x) { return x.title === want || x.title === old; }, 'question "' + Q[k] + '"');
  });

  const pic = {};
  Object.keys(PICTURES).forEach(function (k) {
    pic[k] = pick(images, function (x) { return hasWord(x.title, PICTURES[k]); }, 'picture "' + PICTURES[k][0] + '"');
  });
  // The two step pictures: found by their title, or (first repair) they are the two pictures with no title yet
  const blank = images.filter(function (x) { return x.title === ''; });
  const firstRepair = blank.length === 2;
  ['step3', 'step4'].forEach(function (k, i) {
    const want = norm_(IMG[k][1]);
    pic[k] = firstRepair ? blank[i].item : pick(images, function (x) { return x.title === want; }, 'picture "' + IMG[k][1] + '"');
  });

  const hdrBill = pick(headers, function (x) { return x.title.indexOf('postpaid') >= 0; }, 'heading "Postpaid meter"');
  const hdrPrepaid = pick(headers, function (x) { return x.title.indexOf('prepaid') >= 0; }, 'heading "Prepaid meter"');
  if (pages.length !== 5) trouble.push('sections: found ' + (pages.length + 1) + ', need 6 (welcome + 5 steps)');
  const page = pages.map(function (x) { return x.item; });

  // ---- 3. The order every item must have ----
  const order = [
    pic.welcome, q.consent,
    page[0], pic.about, q.name, q.phone, q.email, q.division, q.area, q.use,
    page[1], pic.connection, q.provider, pic.meterTypes, q.meterType, q.phase, q.since, q.people, q.appliances,
    page[2], pic.step3,
    hdrBill, pic.billGuide, q.billAccount, q.billMeter, q.billPrev, q.billPres, q.billMonth, q.billAmount, q.billPaid,
    hdrPrepaid, pic.prepaidGuide, q.ppMeter, q.ppLastAmount, q.ppLastWhen, q.ppKwh,
    page[3], pic.step4, pic.usage, q.estLevel, q.monthly,
    page[4], pic.payments, q.payMethod, q.payOnTime, pic.problems, q.problems, q.outage, q.story, q.rating,
  ];
  if (!trouble.length && all.length !== order.length) {
    trouble.push('the form has ' + all.length + ' items but this script knows ' + order.length +
      ' (a question, picture or heading was added or removed by hand)');
  }

  // ---- Safety check: stop BEFORE changing anything ----
  if (trouble.length) {
    throw new Error('NOTHING was changed, because the form does not look the way this script expects. ' +
      'Could not match: ' + trouble.join(' · '));
  }

  // ---- 4. Form settings ----
  form.setCollectEmail(false);   // Step 1 already asks for Email
  form.setShuffleQuestions(false);   // shuffling mixes the questions up and pulls them away from their pictures
  form.setProgressBar(true);

  // ---- 5. Step pictures (first repair only: upload them again so each one is surely the right picture) ----
  ['step3', 'step4'].forEach(function (k) {
    if (firstRepair) {
      const blob = pictureBlob_(IMG[k][0]);
      if (blob) pic[k].asImageItem().setImage(blob);
      else Logger.log('⚠️ Picture not found in Drive (old one kept): ' + IMG[k][0]);
    }
    pic[k].setTitle(IMG[k][1]);
  });

  // ---- 6. Section titles + "always continue to the next section" (this is what stops the skipping) ----
  [STEP.s1, STEP.s2, STEP.s3, STEP.s4, STEP.s5].forEach(function (step, i) {
    page[i].asPageBreakItem().setTitle(step[0]).setHelpText(step[1])
      .setGoToPage(FormApp.PageNavigationType.CONTINUE);
  });
  hdrBill.setTitle(HDR.bill[0]).setHelpText(HDR.bill[1]);
  hdrPrepaid.setTitle(HDR.prepaid[0]).setHelpText(HDR.prepaid[1]);

  // ---- 7. Put every item in its place (position numbers, counted from 0) ----
  let moved = 0;
  order.forEach(function (it, i) {
    const from = it.getIndex();
    if (from !== i) { form.moveItem(from, i); moved++; }
  });

  // ---- 8. Step 3 boxes are optional; the two Step 4 questions are for everybody ----
  ['billAccount', 'billMeter', 'billPrev', 'billPres', 'billMonth', 'billAmount', 'billPaid',
    'ppMeter', 'ppLastAmount', 'ppLastWhen', 'ppKwh']
    .forEach(function (k) { setRequired_(q[k], false); });
  setRequired_(q.estLevel, true);
  q.estLevel.setHelpText('Pick the closest one.');
  setRequired_(q.monthly, true);
  q.monthly.setTitle(Q.monthly).setHelpText('Bill or recharge, per month. A guess is fine.');

  // Prepaid meter number: digits, spaces and dashes are all fine
  if (q.ppMeter.getType() === T.TEXT) {
    q.ppMeter.asTextItem().setValidation(FormApp.createTextValidation()
      .requireTextMatchesPattern('^[0-9 -]{4,25}$')
      .setHelpText('Only digits please (spaces are OK)').build());
  }

  // ---- 9. Spreadsheet tabs ----
  refreshSheets();
  rebuildDatabaseSheet();

  // ---- 10. Report ----
  Logger.log('✅ Form is in the 5-step layout: ' + order.length + ' items, ' + moved + ' moved, no skipping.');
  let line = '';
  form.getItems().forEach(function (it) {
    if (it.getType() === T.PAGE_BREAK) { if (line) Logger.log(line); line = '📄 ' + it.getTitle() + ' →'; }
    else if (it.getType() !== T.IMAGE && it.getType() !== T.SECTION_HEADER) line += ' [' + it.getTitle() + ']';
  });
  if (line) Logger.log(line);
  const say = function (label, read) {
    try { return label + ': ' + read(); } catch (err) { return label + ': (could not read)'; }
  };
  Logger.log('⚙️ ' + [
    say('questions shuffled', function () { return form.getShuffleQuestions(); }),
    say('one answer per person', function () { return form.hasLimitOneResponsePerUser(); }),
    say('collects email automatically', function () { return form.collectsEmail(); }),
  ].join(' · '));
  Logger.log('📝 Share link (unchanged): ' + form.getPublishedUrl());
}

// ===================================================================
// 6. SPREADSHEET HELPERS
// ===================================================================
function getSpreadsheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
}

function getRawSheet_(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getFormUrl()) return sheets[i];
  }
  return ss.getSheetByName('Form Responses 1');
}

// Rebuilds the 📊 Dashboard and 📘 Field Guide tabs from scratch
function refreshSheets() {
  const ss = getSpreadsheet_();
  ['📊 Dashboard', '📘 Field Guide'].forEach(function (n) {
    const s = ss.getSheetByName(n);
    if (s) ss.deleteSheet(s);
  });
  buildFieldGuide_(ss);
  buildDashboard_(ss);
  ss.setActiveSheet(ss.getSheetByName('📊 Dashboard'));
  ss.moveActiveSheet(1);
}

// ===================================================================
// 7. 📊 DASHBOARD — live counts + charts
// ===================================================================
function buildDashboard_(ss) {
  const sh = ss.insertSheet('📊 Dashboard');
  const rawSheet = getRawSheet_(ss);
  const raw = "'" + (rawSheet ? rawSheet.getName() : 'Form Responses 1') + "'";
  sh.setHiddenGridlines(true);

  sh.getRange('A1:H1').merge().setValue('⚡ Electricity Survey — Live Dashboard')
    .setFontSize(22).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1E3A8A')
    .setVerticalAlignment('middle').setHorizontalAlignment('left');
  sh.setRowHeight(1, 52);
  sh.getRange('A2:H2').merge().setValue('Updates by itself every time someone submits the form.')
    .setFontColor('#475569').setFontStyle('italic');

  // The whole answer column for a question title.
  // Whole columns ($A:$BZ) are used on purpose: every new answer is INSERTED as a new row,
  // and a range that starts at row 2 would slide down and stop counting.
  const col = function (title) {
    return 'INDEX(' + raw + '!$A:$BZ,0,MATCH("' + title + '",' + raw + '!$1:$1,0))';
  };
  const total = '(COUNTA(' + raw + '!$A:$A)-1)';   // answers = filled rows minus the header row

  const kpis = [
    ['👥 Responses', '=MAX(' + total + ',0)'],
    ['💳 Prepaid', '=IFERROR(COUNTIF(' + col(Q.meterType) + ',"*Prepaid*")/' + total + ',0)'],
    ['🧾 Copied a real bill', '=IFERROR(MAX(COUNTA(' + col(Q.billPres) + ')-1,0),0)'],
    ['😊 Avg happiness (1–5)', '=IFERROR(ROUND(AVERAGE(' + col(Q.rating) + '),1),"–")'],
  ];
  const tileColors = ['#2563EB', '#0D9488', '#DB2777', '#F59E0B'];
  kpis.forEach(function (k, i) {
    const c = 1 + i * 2;
    sh.getRange(4, c, 1, 2).merge().setValue(k[0]).setFontColor('#ffffff').setBackground(tileColors[i])
      .setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(5, c, 1, 2).merge().setFormula(k[1]).setFontSize(26).setFontWeight('bold')
      .setHorizontalAlignment('center').setBackground('#F8FAFC').setFontColor(tileColors[i]);
  });
  sh.getRange(5, 3).setNumberFormat('0%');
  sh.setRowHeight(5, 54);

  // Count tables (columns J:K) that feed the charts. COUNTIF ignores upper/lower case.
  let row = 4;
  const tables = [];
  const addTable = function (title, labels, question, contains) {
    const start = row;
    sh.getRange(row, 10, 1, 2).setValues([[title, 'Count']]).setFontWeight('bold').setBackground('#E0E7FF');
    labels.forEach(function (label, i) {
      const r = row + 1 + i;
      const crit = contains ? '"*"&J' + r + '&"*"' : 'J' + r;
      sh.getRange(r, 10).setValue(label);
      sh.getRange(r, 11).setFormula('=IFERROR(COUNTIF(' + col(question) + ',' + crit + '),0)');
    });
    tables.push(sh.getRange(start, 10, labels.length + 1, 2));
    row += labels.length + 2;
  };
  // "contains" labels are short key words, so small wording edits in the form still count
  addTable('Company', ['DESCO', 'DPDC', 'BREB', 'BPDB', 'NESCO', 'WZPDCL', 'Not sure'], Q.provider, true);          // 0
  addTable('Meter type', ['Prepaid', 'Postpaid', 'Not sure'], Q.meterType, true);                                   // 1
  addTable('Used for', ['Home', 'Shop', 'Factory', 'Farm'], Q.use, true);                                           // 2
  addTable('Problems (last 3 months)', ['Power cut', 'Meter problem', 'Low voltage', 'high bill', 'customer service', 'new connection', 'disconnect', 'No problems'], Q.problems, true); // 3
  addTable('Power cuts', OPT.outage, Q.outage, false);                                                              // 4
  addTable('Monthly cost', OPT.money, Q.monthly, false);                                                            // 5
  addTable('Happiness (1–5)', [1, 2, 3, 4, 5], Q.rating, false);                                                    // 6
  addTable('Division', OPT.divisions, Q.division, false);                                                           // 7
  sh.setColumnWidth(10, 220);

  const palette = ['#2563EB', '#0D9488', '#F59E0B', '#DB2777', '#7C3AED', '#16A34A', '#EF4444', '#64748B'];
  const chartSpecs = [
    [0, Charts.ChartType.PIE, '🏢 Which company?', { pieHole: 0.45 }],
    [1, Charts.ChartType.PIE, '💳 Prepaid vs Postpaid', { pieHole: 0.45 }],
    [3, Charts.ChartType.BAR, '🛠️ Problems faced', { legend: { position: 'none' } }],
    [4, Charts.ChartType.COLUMN, '🌑 How often power goes off', { legend: { position: 'none' } }],
    [2, Charts.ChartType.COLUMN, '🏠 Connection used for', { legend: { position: 'none' } }],
    [7, Charts.ChartType.COLUMN, '🗺️ Responses by division', { legend: { position: 'none' } }],
    [5, Charts.ChartType.COLUMN, '💸 Monthly electricity cost', { legend: { position: 'none' } }],
    [6, Charts.ChartType.COLUMN, '😊 Happiness score', { legend: { position: 'none' } }],
  ];
  chartSpecs.forEach(function (spec, i) {
    const b = sh.newChart().setChartType(spec[1]).addRange(tables[spec[0]])
      .setNumHeaders(1)
      .setPosition(7 + Math.floor(i / 2) * 20, i % 2 === 0 ? 1 : 5, 0, 0)
      .setOption('title', spec[2])
      .setOption('width', 520).setOption('height', 360)
      .setOption('colors', spec[1] === Charts.ChartType.PIE ? palette : [palette[i % palette.length]])
      .setOption('titleTextStyle', { fontSize: 15, bold: true, color: '#0F172A' });
    Object.keys(spec[3]).forEach(function (k) { b.setOption(k, spec[3][k]); });
    sh.insertChart(b.build());
  });
  for (let c = 1; c <= 8; c++) sh.setColumnWidth(c, 130);
}

// ===================================================================
// 8. 📘 FIELD GUIDE — which question fills which database column
// ===================================================================
function buildFieldGuide_(ss) {
  const sh = ss.insertSheet('📘 Field Guide');
  const rows = [
    ['Form question', 'Database table.column', 'How we use it'],
    [Q.name, 'customers.full_name', 'Copied as typed'],
    [Q.phone, 'customers.phone', 'Changed to +8801XXXXXXXXX'],
    [Q.email, 'customers.email', 'Copied (empty allowed)'],
    [Q.area + ' + ' + Q.division, 'customers.address', '"Area, Division, Bangladesh"'],
    [Q.use, 'customers.customer_type', 'Home → Residential; shop/factory/farm → Commercial'],
    ['(made by the sheet)', 'customers.customer_number', CONFIG.customerPrefix + '0001, 0002 …'],
    [Q.billMeter + ' / ' + Q.ppMeter, 'connections.meter_number', 'Spaces removed; if empty → ' + CONFIG.meterPrefix + '0001 …'],
    [Q.phase, 'connections.connection_type', 'Three phase → Three Phase; others → Single Phase'],
    [Q.since, 'connections.installation_date', 'Survey date minus the middle of the range (approximate)'],
    [Q.provider + ' + ' + Q.meterType, 'connections.notes', 'e.g. "DESCO · Prepaid · from survey"'],
    [Q.billPrev + ' / ' + Q.billPres, 'meter_readings.previous_reading / current_reading', 'Real numbers from the bill → status Verified'],
    [Q.ppKwh + ' + ' + Q.monthly, 'meter_readings (estimated)', 'previous = screen kWh − estimated units → status Pending'],
    [Q.billMonth, 'meter_readings.reading_date', 'Last day of that month'],
    [Q.billAmount + ' / ' + Q.billPaid, 'bills (check only)', 'Bills are made by our SQL bill function; these numbers are for checking it'],
    [Q.payMethod, 'payments.method', 'bKash/Nagad → Mobile Banking, Bank → Bank Transfer, Cash, Card, Other'],
    [Q.problems, 'service_requests.category', 'First problem ticked'],
    [Q.outage, 'service_requests.priority', 'Rarely→Low, weekly→Medium, daily→High, many times a day→Critical'],
    [Q.story, 'service_requests.description', 'Copied; if empty we write "Reported in survey: …"'],
    [Q.people + ', ' + Q.appliances + ', ' + Q.estLevel + ', ' + Q.rating, '(survey only)', 'Used for the dashboard and to sanity-check units'],
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1E3A8A').setFontColor('#ffffff');
  sh.setColumnWidths(1, 1, 360); sh.setColumnWidths(2, 1, 300); sh.setColumnWidths(3, 1, 420);
  sh.setFrozenRows(1);
  sh.getRange(2, 1, rows.length - 1, 3).applyRowBanding(SpreadsheetApp.BandingTheme.INDIGO, false, false);
}

// ===================================================================
// 9. 🗄️ DATABASE READY + 🧾 SQL INSERTS
// ===================================================================
const DB_HEADERS = [
  'submitted_at', 'customer_number', 'full_name', 'phone', 'email', 'address', 'customer_type',
  'meter_number', 'meter_number_is_real', 'connection_type', 'installation_date', 'provider', 'meter_type',
  'previous_reading', 'current_reading', 'units_used', 'reading_date', 'reading_status', 'est_monthly_units',
  'bill_amount_tk', 'bill_status', 'monthly_cost_range', 'payment_method',
  'request_category', 'all_problems', 'priority', 'description', 'people', 'happiness', 'check_notes',
];

// Key words → database values. Matching ignores upper/lower case, emojis and punctuation,
// so small wording edits in the form do not break the cleaning.
const KEYS = {
  problems: [['power cut', 'Power Outage'], ['load shedding', 'Power Outage'], ['meter problem', 'Meter Issue'],
    ['voltage', 'Connection Issue'], ['bill', 'Billing Inquiry'], ['customer service', 'General Complaint'],
    ['new connection', 'New Connection Request'], ['disconnect', 'Disconnection Request']],
  pay: [['bkash', 'Mobile Banking'], ['nagad', 'Mobile Banking'], ['rocket', 'Mobile Banking'], ['upay', 'Mobile Banking'],
    ['bank', 'Bank Transfer'], ['cash', 'Cash'], ['card', 'Card']],
  paid: [['partly', 'Partially Paid'], ['not paid', 'Unpaid'], ['last date', 'Overdue'], ['paid', 'Paid']],
  level: [['very heavy', 400], ['heavy', 250], ['normal', 150], ['light', 80]],
  outage: [['rarely', 'Low'], ['week', 'Medium'], ['every day', 'High'], ['many times', 'Critical']],
  since: [['less than 1', 0.5], ['1 3', 2], ['3 5', 4], ['5 10', 7], ['more than 10', 12]],
  money: [['under tk 500', 350], ['500 1 000', 750], ['1 000 2 000', 1500], ['2 000 3 500', 2750], ['3 500 5 000', 4250], ['over tk 5 000', 6000]],
  month: [['this month', 0], ['last month', 1], ['2 months ago', 2]],
};

// First value whose key word appears in the answer ('' if none)
function lookup_(answer, list) {
  const a = norm_(answer);
  if (!a) return '';
  for (let i = 0; i < list.length; i++) {
    if (a.indexOf(list[i][0]) >= 0) return list[i][1];
  }
  return '';
}

/**
 * Re-reads ALL answers and rewrites the 🗄️ Database Ready and 🧾 SQL Inserts tabs.
 * Runs automatically after every form submit. You can also run it by hand.
 */
function rebuildDatabaseSheet() {
  // Two answers can arrive in the same second; let one cleaning finish before the next starts
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    rebuildDatabaseSheetNow_();
  } finally {
    lock.releaseLock();
  }
}

function rebuildDatabaseSheetNow_() {
  const ss = getSpreadsheet_();
  // Read the whole "Form Responses" tab in one go (fast, even with hundreds of answers).
  // getDisplayValues gives every cell as text exactly as shown, so "045820" keeps its zero.
  const raw = getRawSheet_(ss);
  const rows = [];
  if (raw && raw.getLastRow() >= 2) {
    const range = raw.getRange(1, 1, raw.getLastRow(), raw.getLastColumn());
    const shown = range.getDisplayValues();
    const real = range.getValues();
    const heads = shown[0].map(norm_);
    for (let r = 1; r < shown.length; r++) {
      if (!shown[r][0]) continue;                                   // empty row
      const answers = { _time: real[r][0] instanceof Date ? real[r][0] : new Date(shown[r][0]) };
      for (let c = 1; c < heads.length; c++) {
        if (shown[r][c] !== '') answers[heads[c]] = shown[r][c];
      }
      rows.push(answers);
    }
  }
  const get = function (row, title) {
    const v = row[norm_(title)];
    return v === undefined || v === null ? '' : String(v).trim();
  };

  const out = [];
  const sqlLines = [];
  const seenMeters = {};
  let n = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (norm_(get(row, Q.consent)).indexOf('yes') < 0) continue;   // no consent → skip
    n++;
    const notes = [];
    const submitted = new Date(row._time);
    const custNo = CONFIG.customerPrefix + pad_(n, 4);

    // ----- customers -----
    const fullName = (get(row, Q.name) || 'Survey Respondent ' + n).slice(0, 100);
    const phone = cleanPhone_(get(row, Q.phone));
    const email = get(row, Q.email);
    const address = [get(row, Q.area), get(row, Q.division), 'Bangladesh'].filter(String).join(', ');
    const customerType = norm_(get(row, Q.use)).indexOf('home') >= 0 ? 'Residential' : 'Commercial';

    // ----- connections -----
    let meter = (get(row, Q.billMeter) || get(row, Q.ppMeter)).replace(/[\s-]/g, '').toUpperCase();
    let meterIsReal = 'yes';
    if (meter.length > 20) { notes.push('meter no too long, cut to 20'); meter = meter.slice(0, 20); }
    if (!meter) { meter = CONFIG.meterPrefix + pad_(n, 4); meterIsReal = 'no (made up)'; }
    const duplicateMeter = !!seenMeters[meter];
    if (duplicateMeter) notes.push('same meter as ' + seenMeters[meter] + ' (duplicate?), reading NOT exported');
    seenMeters[meter] = custNo;
    const phase = norm_(get(row, Q.phase));
    const connectionType = phase.indexOf('three') === 0 ? 'Three Phase' : 'Single Phase';
    if (phase.indexOf('not sure') >= 0) notes.push('phase guessed');
    const years = lookup_(get(row, Q.since), KEYS.since) || 3;
    const install = new Date(submitted.getTime() - years * 365.25 * 24 * 3600 * 1000);
    install.setDate(1);
    const provider = get(row, Q.provider).split(' (')[0];
    const mt = norm_(get(row, Q.meterType));
    const meterType = mt.indexOf('prepaid') >= 0 ? 'Prepaid' : mt.indexOf('postpaid') >= 0 ? 'Postpaid' : 'Not sure';

    // ----- money & estimated units -----
    const moneyRange = get(row, Q.monthly);
    let estUnits = '';
    const mid = lookup_(moneyRange, KEYS.money);
    if (mid) estUnits = Math.round(mid / CONFIG.takaPerUnit);
    else if (lookup_(get(row, Q.estLevel), KEYS.level)) estUnits = lookup_(get(row, Q.estLevel), KEYS.level);

    // ----- meter_readings -----
    let prev = num_(get(row, Q.billPrev));
    let cur = num_(get(row, Q.billPres));
    let readingDate = '';
    let readingStatus = '';
    if (prev !== '' && cur !== '') {
      if (cur < prev) { notes.push('present < previous, reading NOT exported'); prev = ''; cur = ''; }
      else {
        readingStatus = 'Verified';
        readingDate = monthEnd_(submitted, get(row, Q.billMonth));
        if (cur - prev > 5000) notes.push('very high units, please check');
      }
    } else if (prev !== '' || cur !== '') {
      notes.push('only one bill reading given');
      prev = ''; cur = '';
    }
    const kwh = num_(get(row, Q.ppKwh));
    if (cur === '' && kwh !== '' && estUnits !== '' && kwh >= estUnits) {
      cur = kwh; prev = kwh - estUnits; readingStatus = 'Pending';
      readingDate = Utilities.formatDate(submitted, 'Asia/Dhaka', 'yyyy-MM-dd');
      notes.push('previous reading estimated');
    }
    if (duplicateMeter) { prev = ''; cur = ''; readingDate = ''; readingStatus = ''; }
    const units = (prev !== '' && cur !== '') ? cur - prev : '';
    if (units === '' && meterIsReal !== 'yes') notes.push('estimate only');

    // ----- bills (for checking) -----
    const billAmount = num_(get(row, Q.billAmount));
    const billStatus = lookup_(get(row, Q.billPaid), KEYS.paid);

    // ----- payments -----
    const payAns = get(row, Q.payMethod);
    const payMethod = payAns ? (lookup_(payAns, KEYS.pay) || 'Other') : '';

    // ----- service_requests -----
    const probAns = norm_(get(row, Q.problems));
    const cats = [];
    KEYS.problems.forEach(function (k) {
      if (probAns.indexOf(k[0]) >= 0 && cats.indexOf(k[1]) < 0) cats.push(k[1]);
    });
    const category = cats.length ? cats[0] : '';
    const priority = lookup_(get(row, Q.outage), KEYS.outage) || 'Medium';
    const story = get(row, Q.story);
    const description = story || (cats.length ? 'Reported in survey: ' + cats.join(', ') : '');

    out.push([
      Utilities.formatDate(submitted, 'Asia/Dhaka', 'yyyy-MM-dd HH:mm'), custNo, fullName, phone, email, address, customerType,
      meter, meterIsReal, connectionType, Utilities.formatDate(install, 'Asia/Dhaka', 'yyyy-MM-dd'), provider, meterType,
      prev, cur, units, readingDate, readingStatus, estUnits,
      billAmount, billStatus, moneyRange, payMethod,
      category, cats.join(', '), category ? priority : '', description,
      get(row, Q.people), get(row, Q.rating), notes.length ? '⚠️ ' + notes.join('; ') : '✅ OK',
    ]);

    // ----- SQL INSERT statements (each one is safe to run twice) -----
    const connNotes = [provider, meterType, 'from survey'].filter(String).join(' · ');
    sqlLines.push(['-- ' + custNo + ' · ' + fullName]);
    sqlLines.push(["INSERT INTO customers (customer_number, full_name, phone, email, address, customer_type, status) VALUES (" +
      [s_(custNo), s_(fullName), s_(phone), email ? s_(email) : 'NULL', s_(address), s_(customerType), "'Active'"].join(', ') +
      ") ON CONFLICT (customer_number) DO NOTHING;"]);
    sqlLines.push(["INSERT INTO connections (customer_id, meter_number, connection_type, installation_date, status, notes) SELECT id, " +
      [s_(meter), s_(connectionType), s_(Utilities.formatDate(install, 'Asia/Dhaka', 'yyyy-MM-dd')), "'Active'", s_(connNotes)].join(', ') +
      " FROM customers WHERE customer_number = " + s_(custNo) + " ON CONFLICT (meter_number) DO NOTHING;"]);
    if (units !== '') {
      sqlLines.push(["INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, notes) SELECT c.id, " +
        [Math.round(prev), Math.round(cur), s_(readingDate), s_(readingStatus), s_(readingStatus === 'Verified' ? 'Copied from customer bill (survey)' : 'Estimated from survey answers')].join(', ') +
        " FROM connections c WHERE c.meter_number = " + s_(meter) +
        " AND NOT EXISTS (SELECT 1 FROM meter_readings r WHERE r.connection_id = c.id AND r.reading_date = " + s_(readingDate) + ");"]);
    }
    if (category) {
      sqlLines.push(["INSERT INTO service_requests (request_number, customer_id, category, priority, status, description) SELECT " +
        [s_(CONFIG.requestPrefix + pad_(n, 4)), 'id', s_(category), s_(priority), "'Pending'", s_(description)].join(', ') +
        " FROM customers WHERE customer_number = " + s_(custNo) + " ON CONFLICT (request_number) DO NOTHING;"]);
    }
  }

  // Write 🗄️ Database Ready (meter numbers kept as text so leading zeros stay)
  const db = ss.getSheetByName('🗄️ Database Ready');
  if (db.getLastRow() > 1) db.getRange(2, 1, db.getLastRow() - 1, DB_HEADERS.length).clearContent();
  db.getRange(2, 8, Math.max(out.length, 1), 1).setNumberFormat('@');
  if (out.length) db.getRange(2, 1, out.length, DB_HEADERS.length).setValues(out);

  // Write 🧾 SQL Inserts
  const sql = ss.getSheetByName('🧾 SQL Inserts');
  if (sql.getLastRow() > 2) sql.getRange(3, 1, sql.getLastRow() - 2, 1).clearContent();
  if (sqlLines.length) sql.getRange(3, 1, sqlLines.length, 1).setValues(sqlLines);
}

// ===================================================================
// 10. SMALL HELPERS
// ===================================================================
// "🧾 Postpaid (A bill…)" → "postpaid a bill …" : lower case, letters and numbers only
function norm_(text) {
  return String(text === null || text === undefined ? '' : text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function pad_(n, size) { return String(n).padStart(size, '0'); }

// "8,412" → 8412 ; "" → ""
function num_(text) {
  if (text === '' || text === null || text === undefined) return '';
  const v = Number(String(text).replace(/[, ]/g, ''));
  return isNaN(v) ? '' : v;
}

// SQL text value with quotes escaped
function s_(text) { return "'" + String(text).replace(/'/g, "''") + "'"; }

// 01712345678 / 8801712345678 / +8801712345678 → +8801712345678
function cleanPhone_(text) {
  const d = String(text).replace(/\D/g, '');
  if (!d) return 'Not given';
  let local = d;
  if (local.indexOf('88') === 0) local = local.slice(2);
  if (local.indexOf('0') !== 0) local = '0' + local;
  return local.length === 11 ? '+88' + local : text;
}

// "This month / Last month / 2 months ago" → last day of that month
function monthEnd_(submitted, answer) {
  const back = lookup_(answer, KEYS.month);
  if (back === '' || back === 0) return Utilities.formatDate(submitted, 'Asia/Dhaka', 'yyyy-MM-dd');
  const d = new Date(submitted.getFullYear(), submitted.getMonth() - back + 1, 0);
  return Utilities.formatDate(d, 'Asia/Dhaka', 'yyyy-MM-dd');
}
