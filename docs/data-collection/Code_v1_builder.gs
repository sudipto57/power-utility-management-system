/**
 * Power Utility Management System — Electricity Survey builder
 * ------------------------------------------------------------
 * This ONE script creates, in your own Google account:
 *   1. A colourful Google Form (5 short steps, pictures, smart skipping)
 *   2. A Google Sheet that receives every answer, with
 *        📊 Dashboard       – live counts + charts
 *        🗄️ Database Ready  – every answer cleaned into our table columns
 *        🧾 SQL Inserts     – ready INSERT statements for pgAdmin / Supabase
 *        📘 Field Guide     – which question fills which database column
 *
 * The pictures (survey_XX_....png) live in your Google Drive.
 * setupSurvey() was already run once — do NOT run it again (it would make a second form).
 * rebuildDatabaseSheet() runs by itself after every answer; you may also run it by hand.
 *
 * Everything below is plain JavaScript. Each part has a comment that says what it does.
 */

// ===================================================================
// 1. SETTINGS — change these if you like
// ===================================================================
const CONFIG = {
  formTitle: '⚡ Electricity Survey — Power Utility Management System',
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
//    (The sheet's column headers are exactly these titles.)
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
  route: 'Can you quickly check a bill, a recharge SMS or your meter right now?',
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
  ppMonthly: 'About how much do you recharge in a month?',
  ppKwh: 'Total reading on the meter screen (kWh)',
  estLevel: 'Which one sounds like your home or shop?',
  estMonthly: 'About how much do you pay for electricity in a month?',
  payMethod: 'How do you usually pay or recharge?',
  payOnTime: 'Do you usually pay on time?',
  problems: 'In the last 3 months, which problems did you face?',
  outage: 'How often does the power go off?',
  story: 'Tell us about your biggest electricity problem',
  rating: 'Overall, how happy are you with your electricity service?',
};

// ===================================================================
// 3. ANSWER CHOICES — kept in one place so the form, the dashboard
//    and the cleaner always match.
// ===================================================================
const OPT = {
  consentYes: '✅ Yes, I agree',
  consentNo: '❌ No, thanks',
  divisions: ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'],
  use: ['🏠 Home (Residential)', '🏪 Shop / Office / Business', '🏭 Factory / Industry', '🌾 Farm / Irrigation pump'],
  providers: [
    'DESCO (Dhaka North, Gazipur, Tongi)',
    'DPDC (Dhaka South, Narayanganj)',
    'BREB / Palli Bidyut Samity (village & upazila areas)',
    'BPDB (Bidyut Unnayan Board city areas)',
    'NESCO (Rajshahi & Rangpur cities)',
    'WZPDCL / Ozopadico (Khulna & Barishal cities)',
    'Not sure',
  ],
  meterType: ['💳 Prepaid (I recharge first)', '🧾 Postpaid (a bill comes every month)', '🤷 Not sure'],
  phase: ['Single phase — most homes & small shops', 'Three phase — big buildings, factories, heavy motors', '🤷 Not sure'],
  since: ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', 'More than 10 years', 'Not sure'],
  people: ['1–2 people', '3–4 people', '5–6 people', '7 or more', 'It is a business'],
  appliances: ['Fans', 'Lights', 'Fridge', 'TV', 'AC', 'Iron', 'Water pump / motor', 'Rice cooker / induction', 'Computer / laptop', 'Water heater / geyser'],
  routeBill: '🧾 Yes — I have a paper bill, bill SMS or bill app',
  routePrepaid: '💳 Yes — I can see my prepaid meter, recharge SMS or bKash/Nagad history',
  routeEstimate: '🙅 No — I will just estimate (also fine!)',
  billMonth: ['This month', 'Last month', '2 months ago', 'Older'],
  billPaid: ['✅ Paid', '🌓 Partly paid', '⏳ Not paid yet', '⚠️ Last date has passed'],
  ppLastWhen: ['This week', 'This month', 'Last month', "Don't remember"],
  money: ['Under Tk 500', 'Tk 500–1,000', 'Tk 1,000–2,000', 'Tk 2,000–3,500', 'Tk 3,500–5,000', 'Over Tk 5,000'],
  estLevel: ['💡 Light — lights & fans', '📺 Normal — + fridge, TV', '🧊 Heavy — + many fans, iron, motor', '❄️ Very heavy — + AC / heater, or a shop'],
  payMethod: ['📱 bKash / Nagad / Rocket / Upay', '🏦 Bank / internet banking', '💵 Cash at office or shop', '💳 Card'],
  payOnTime: ['Always', 'Mostly', 'Sometimes late', 'Often late'],
  problems: [
    '🌑 Power cut / load-shedding',
    '📟 Meter problem',
    '🔌 Low voltage / line or connection problem',
    '🧾 Wrong or very high bill',
    '😤 Bad customer service',
    '➕ Need a new connection',
    '➖ Want to disconnect',
    '🙂 No problems',
  ],
  outage: ['Rarely', 'Once or twice a week', 'Almost every day', 'Many times a day'],
};

// Survey answer → database CHECK value
const MAP = {
  problemToCategory: {
    '🌑 Power cut / load-shedding': 'Power Outage',
    '📟 Meter problem': 'Meter Issue',
    '🔌 Low voltage / line or connection problem': 'Connection Issue',
    '🧾 Wrong or very high bill': 'Billing Inquiry',
    '😤 Bad customer service': 'General Complaint',
    '➕ Need a new connection': 'New Connection Request',
    '➖ Want to disconnect': 'Disconnection Request',
  },
  outageToPriority: {
    'Rarely': 'Low',
    'Once or twice a week': 'Medium',
    'Almost every day': 'High',
    'Many times a day': 'Critical',
  },
  billPaidToStatus: {
    '✅ Paid': 'Paid',
    '🌓 Partly paid': 'Partially Paid',
    '⏳ Not paid yet': 'Unpaid',
    '⚠️ Last date has passed': 'Overdue',
  },
  payToMethod: {
    '📱 bKash / Nagad / Rocket / Upay': 'Mobile Banking',
    '🏦 Bank / internet banking': 'Bank Transfer',
    '💵 Cash at office or shop': 'Cash',
    '💳 Card': 'Card',
  },
  // middle of each money range, in Taka
  moneyMid: { 'Under Tk 500': 350, 'Tk 500–1,000': 750, 'Tk 1,000–2,000': 1500, 'Tk 2,000–3,500': 2750, 'Tk 3,500–5,000': 4250, 'Over Tk 5,000': 6000 },
  // typical units per month for the "estimate" picture
  levelUnits: { '💡 Light — lights & fans': 80, '📺 Normal — + fridge, TV': 150, '🧊 Heavy — + many fans, iron, motor': 250, '❄️ Very heavy — + AC / heater, or a shop': 400 },
  // years ago (middle of each range)
  sinceYears: { 'Less than 1 year': 0.5, '1–3 years': 2, '3–5 years': 4, '5–10 years': 7, 'More than 10 years': 12, 'Not sure': 3 },
};

// Picture file names (in your Google Drive)
const IMG = {
  welcome: 'survey_01_welcome.png',
  step1: 'survey_02_step1.png',
  step2: 'survey_03_step2.png',
  meterTypes: 'survey_04_meter_types.png',
  step3: 'survey_05_step3.png',
  step4: 'survey_06_step4.png',
  bill: 'survey_07_bill_guide.png',
  prepaid: 'survey_08_prepaid_guide.png',
  usage: 'survey_09_usage_estimate.png',
  step5: 'survey_10_step5.png',
  problems: 'survey_11_problems.png',
};

// ===================================================================
// 4. MAIN FUNCTION — run this one (only once)
// ===================================================================
function setupSurvey() {
  const form = buildForm_();
  const ss = SpreadsheetApp.create(CONFIG.sheetTitle);
  ss.setSpreadsheetLocale('en_US'); // so formulas use commas
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  Utilities.sleep(3000); // give Google a moment to create the "Form Responses 1" tab

  // Remember the IDs so the automatic cleaner can find them later
  PropertiesService.getScriptProperties().setProperties({
    FORM_ID: form.getId(),
    SHEET_ID: ss.getId(),
  });

  buildFieldGuide_(ss);
  buildDatabaseSheets_(ss);
  buildDashboard_(ss);

  // Remove the empty "Sheet1" that every new spreadsheet starts with
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName('📊 Dashboard'));
  ss.moveActiveSheet(1);

  // Put the form, the sheet and the pictures together in one Drive folder
  try {
    const folder = DriveApp.createFolder('Power Utility Management System — Electricity Survey');
    DriveApp.getFileById(form.getId()).moveTo(folder);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    const pics = folder.createFolder('Survey pictures');
    Object.keys(IMG).map(function (k) { return IMG[k]; }).concat(['survey_00_header.png']).forEach(function (name) {
      const files = DriveApp.getFilesByName(name);
      if (files.hasNext()) files.next().moveTo(pics);
    });
    Logger.log('📁 Drive folder:                 ' + folder.getUrl());
  } catch (err) {
    Logger.log('(Could not tidy files into a folder: ' + err + ')');
  }

  // Clean every new answer automatically
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rebuildDatabaseSheet').forSpreadsheet(ss).onFormSubmit().create();

  Logger.log('✅ Done!');
  Logger.log('📝 Share this link with people:  ' + form.getPublishedUrl());
  Logger.log('✏️ Edit the form:               ' + form.getEditUrl());
  Logger.log('📊 Responses spreadsheet:       ' + ss.getUrl());
}

// ===================================================================
// 5. THE FORM
// ===================================================================
function buildForm_() {
  const form = FormApp.create(CONFIG.formTitle);
  form.setDescription(
    'We are university students building a Power Utility Management System (a database + website for an electricity company). ' +
    'Your real answers help us test it with real-life data.\n\n' +
    '⏱️ 3–4 minutes  ·  🙌 You do NOT need to remember your meter number or readings  ·  🔒 Used only for our study\n\n' +
    'আমরা বিশ্ববিদ্যালয়ের শিক্ষার্থী। আপনার উত্তর শুধু আমাদের প্রজেক্টের কাজে ব্যবহার হবে। মিটার নম্বর মনে না থাকলেও সমস্যা নেই!'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(true);
  form.setConfirmationMessage(
    '⚡ Thank you! Your answers just powered up our database.\n' +
    'ধন্যবাদ! 🙏 Please share this form with your family and friends — every answer helps.'
  );

  // ---------- Page 0: welcome + consent ----------
  addImage_(form, IMG.welcome);
  const consent = form.addMultipleChoiceItem().setTitle(Q.consent).setRequired(true)
    .setHelpText('We only ask for an area (not your house address). Nothing is sold or shared. · আপনার তথ্য গোপন রাখা হবে।');

  // ---------- Page 1: About you  (→ customers table) ----------
  form.addPageBreakItem().setTitle('Step 1 of 5 · About you')
    .setHelpText('আপনার সম্পর্কে — শুধু প্রাথমিক তথ্য।');
  addImage_(form, IMG.step1);
  form.addTextItem().setTitle(Q.name).setRequired(true)
    .setHelpText('A nickname is fine too. · নাম / ডাকনাম');
  form.addTextItem().setTitle(Q.phone)
    .setHelpText('Optional · 11 digits, e.g. 01712345678 · ঐচ্ছিক')
    .setValidation(FormApp.createTextValidation()
      .requireTextMatchesPattern('^(\\+?88)?0?1[3-9][0-9]{8}$')
      .setHelpText('Please type an 11-digit Bangladeshi mobile number, e.g. 01712345678')
      .build());
  form.addTextItem().setTitle(Q.email)
    .setHelpText('Optional')
    .setValidation(FormApp.createTextValidation().requireTextIsEmail()
      .setHelpText('That does not look like an email address').build());
  form.addListItem().setTitle(Q.division).setRequired(true).setChoiceValues(OPT.divisions)
    .setHelpText('বিভাগ');
  form.addTextItem().setTitle(Q.area).setRequired(true)
    .setHelpText('e.g. Mirpur 10 · Kotwali · Savar. No house number needed. · এলাকা / থানা / উপজেলা');
  form.addMultipleChoiceItem().setTitle(Q.use).setRequired(true).setChoiceValues(OPT.use)
    .setHelpText('সংযোগটি কোথায় ব্যবহার হয়?');

  // ---------- Page 2: Your connection  (→ connections table) ----------
  form.addPageBreakItem().setTitle('Step 2 of 5 · Your electricity connection')
    .setHelpText('"Not sure" is always OK. · নিশ্চিত না হলে "Not sure" দিন।');
  addImage_(form, IMG.step2);
  form.addListItem().setTitle(Q.provider).setRequired(true).setChoiceValues(OPT.providers)
    .setHelpText('The company name is printed on your bill or recharge SMS. · বিদ্যুৎ সরবরাহকারী কোম্পানি');
  addImage_(form, IMG.meterTypes);
  form.addMultipleChoiceItem().setTitle(Q.meterType).setRequired(true).setChoiceValues(OPT.meterType)
    .setHelpText('প্রিপেইড না পোস্টপেইড?');
  form.addMultipleChoiceItem().setTitle(Q.phase).setRequired(true).setChoiceValues(OPT.phase)
    .setHelpText('Most homes are single phase. · বেশিরভাগ বাসায় সিঙ্গেল ফেজ।');
  form.addMultipleChoiceItem().setTitle(Q.since).setRequired(true).setChoiceValues(OPT.since)
    .setHelpText('A rough guess is fine. · কত বছর ধরে এই সংযোগ?');
  form.addMultipleChoiceItem().setTitle(Q.people).setChoiceValues(OPT.people)
    .setHelpText('Optional · কতজন এই সংযোগ ব্যবহার করেন?');
  form.addCheckboxItem().setTitle(Q.appliances).setChoiceValues(OPT.appliances)
    .setHelpText('Optional · Tick all that apply. This helps us estimate your usage.');

  // ---------- Page 3: Quick check (smart skipping) ----------
  form.addPageBreakItem().setTitle('Step 3 of 5 · Quick check')
    .setHelpText('Only if it is easy for you right now. Otherwise choose "estimate". · হাতের কাছে না থাকলে আনুমানিক দিন।');
  addImage_(form, IMG.step3);
  const route = form.addMultipleChoiceItem().setTitle(Q.route).setRequired(true);

  // ---------- Page 4A: Postpaid bill  (→ meter_readings + bills) ----------
  const p4bill = form.addPageBreakItem().setTitle('Step 4 of 5 · Copy from your bill')
    .setHelpText('Fill only what you can see. Every box here is optional. · বিল দেখে যা পারেন লিখুন।');
  addImage_(form, IMG.step4);
  addImage_(form, IMG.bill);
  form.addTextItem().setTitle(Q.billAccount).setHelpText('Optional · blue box on the bill');
  form.addTextItem().setTitle(Q.billMeter).setHelpText('Optional · blue box on the bill · মিটার নম্বর');
  form.addTextItem().setTitle(Q.billPrev).setHelpText('Pink box · পূর্ববর্তী রিডিং')
    .setValidation(numberRule_());
  form.addTextItem().setTitle(Q.billPres).setHelpText('Pink box · বর্তমান রিডিং')
    .setValidation(numberRule_());
  form.addMultipleChoiceItem().setTitle(Q.billMonth).setChoiceValues(OPT.billMonth);
  form.addTextItem().setTitle(Q.billAmount).setHelpText('Green box · মোট টাকা')
    .setValidation(numberRule_());
  form.addMultipleChoiceItem().setTitle(Q.billPaid).setChoiceValues(OPT.billPaid);

  // ---------- Page 4B: Prepaid  (→ meter_readings + payments) ----------
  const p4prepaid = form.addPageBreakItem().setTitle('Step 4 of 5 · Your prepaid meter')
    .setHelpText('Fill only what you can see. Every box here is optional. · যা দেখতে পাচ্ছেন শুধু তা লিখুন।');
  addImage_(form, IMG.step4);
  addImage_(form, IMG.prepaid);
  form.addTextItem().setTitle(Q.ppMeter).setHelpText('Optional · on the meter sticker or in the recharge SMS · মিটার নম্বর')
    .setValidation(FormApp.createTextValidation()
      .requireTextMatchesPattern('^[0-9 -]{6,25}$')
      .setHelpText('Only digits please (spaces are OK)').build());
  form.addTextItem().setTitle(Q.ppLastAmount).setHelpText('Optional · সর্বশেষ রিচার্জের টাকা')
    .setValidation(numberRule_());
  form.addMultipleChoiceItem().setTitle(Q.ppLastWhen).setChoiceValues(OPT.ppLastWhen);
  form.addMultipleChoiceItem().setTitle(Q.ppMonthly).setChoiceValues(OPT.money)
    .setHelpText('মাসে মোট কত টাকা রিচার্জ করেন?');
  form.addTextItem().setTitle(Q.ppKwh).setHelpText('Optional · only if you see a number with "kWh" · skip if not sure')
    .setValidation(numberRule_());

  // ---------- Page 4C: Estimate (no bill, no meter) ----------
  const p4estimate = form.addPageBreakItem().setTitle('Step 4 of 5 · Quick estimate')
    .setHelpText('No bill needed. Your best guess is perfect. · আনুমানিক উত্তরই যথেষ্ট।');
  addImage_(form, IMG.step4);
  addImage_(form, IMG.usage);
  form.addMultipleChoiceItem().setTitle(Q.estLevel).setChoiceValues(OPT.estLevel);
  form.addMultipleChoiceItem().setTitle(Q.estMonthly).setChoiceValues(OPT.money)
    .setHelpText('Bill or recharge, per month · মাসে আনুমানিক খরচ');

  // ---------- Page 5: Payments & service  (→ payments + service_requests) ----------
  const p5 = form.addPageBreakItem().setTitle('Step 5 of 5 · Payments & service')
    .setHelpText('Last step! · শেষ ধাপ!');
  addImage_(form, IMG.step5);
  form.addCheckboxItem().setTitle(Q.payMethod).setChoiceValues(OPT.payMethod).showOtherOption(true)
    .setHelpText('Tick all that apply · কীভাবে বিল/রিচার্জ দেন?');
  form.addMultipleChoiceItem().setTitle(Q.payOnTime).setChoiceValues(OPT.payOnTime);
  addImage_(form, IMG.problems);
  form.addCheckboxItem().setTitle(Q.problems).setChoiceValues(OPT.problems)
    .setHelpText('Tick all that apply · গত ৩ মাসে কোন সমস্যায় পড়েছেন?');
  form.addMultipleChoiceItem().setTitle(Q.outage).setChoiceValues(OPT.outage)
    .setHelpText('বিদ্যুৎ কতবার যায়?');
  form.addParagraphTextItem().setTitle(Q.story)
    .setHelpText('Optional · Bangla or English, both OK · বাংলা বা ইংরেজি');
  form.addScaleItem().setTitle(Q.rating).setBounds(1, 5).setLabels('😞 Not happy', '😍 Very happy');

  // ---------- Smart skipping (branching) ----------
  // Consent: "No" ends the form straight away.
  consent.setChoices([
    consent.createChoice(OPT.consentYes, FormApp.PageNavigationType.CONTINUE),
    consent.createChoice(OPT.consentNo, FormApp.PageNavigationType.SUBMIT),
  ]);
  // Quick check: jump to the right Step 4 page.
  route.setChoices([
    route.createChoice(OPT.routeBill, p4bill),
    route.createChoice(OPT.routePrepaid, p4prepaid),
    route.createChoice(OPT.routeEstimate, p4estimate),
  ]);
  // After the bill page and after the prepaid page → go to Step 5
  // (setGoToPage on a page break = "where to go when the page BEFORE it ends")
  p4prepaid.setGoToPage(p5);
  p4estimate.setGoToPage(p5);

  return form;
}

function numberRule_() {
  return FormApp.createTextValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setHelpText('Numbers only, e.g. 8412')
    .build();
}

// Adds a picture from your Google Drive. If the picture is not found,
// the form is still created — just without that picture.
function addImage_(form, fileName) {
  const files = DriveApp.getFilesByName(fileName);
  if (!files.hasNext()) {
    Logger.log('⚠️ Picture not found in Drive (skipped): ' + fileName);
    return null;
  }
  return form.addImageItem().setImage(files.next().getBlob()).setAlignment(FormApp.Alignment.CENTER);
}

// ===================================================================
// 6. FIND THE RAW RESPONSES TAB
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

// ===================================================================
// 7. 📊 DASHBOARD — live counts + charts
// ===================================================================
function buildDashboard_(ss) {
  const sh = ss.insertSheet('📊 Dashboard');
  const rawSheet = getRawSheet_(ss);
  const raw = "'" + (rawSheet ? rawSheet.getName() : 'Form Responses 1') + "'";
  sh.setHiddenGridlines(true);

  // Title
  sh.getRange('A1:H1').merge().setValue('⚡ Electricity Survey — Live Dashboard')
    .setFontSize(22).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1E3A8A')
    .setVerticalAlignment('middle').setHorizontalAlignment('left');
  sh.setRowHeight(1, 52);
  sh.getRange('A2:H2').merge().setValue('Updates by itself every time someone submits the form.')
    .setFontColor('#475569').setFontStyle('italic');

  // A column formula helper: the whole answer column for a question title
  const col = function (title) {
    return 'INDEX(' + raw + '!$A$2:$AZ,0,MATCH("' + title + '",' + raw + '!$1:$1,0))';
  };

  // KPI tiles (row 4-5)
  const kpis = [
    ['👥 Responses', '=COUNTA(' + raw + '!A2:A)'],
    ['💳 Prepaid', '=IFERROR(COUNTIF(' + col(Q.meterType) + ',"*Prepaid*")/COUNTA(' + raw + '!A2:A),0)'],
    ['🧾 Copied a real bill', '=IFERROR(COUNTIF(' + col(Q.route) + ',"*paper bill*"),0)'],
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

  // Small count tables (columns J:K, far right) that feed the charts
  let row = 4;
  const tables = [];
  const addTable = function (title, labels, mode, question) {
    const start = row;
    sh.getRange(row, 10, 1, 2).setValues([[title, 'Count']]).setFontWeight('bold').setBackground('#E0E7FF');
    labels.forEach(function (label, i) {
      const crit = mode === 'contains' ? '"*"&J' + (row + 1 + i) + '&"*"' : 'J' + (row + 1 + i);
      sh.getRange(row + 1 + i, 10).setValue(label);
      sh.getRange(row + 1 + i, 11).setFormula('=IFERROR(COUNTIF(' + col(question) + ',' + crit + '),0)');
    });
    tables.push({ title: title, range: sh.getRange(start, 10, labels.length + 1, 2) });
    row += labels.length + 2;
  };

  addTable('Company', OPT.providers.map(function (p) { return p.split(' (')[0]; }), 'contains', Q.provider);
  addTable('Meter type', ['Prepaid', 'Postpaid', 'Not sure'], 'contains', Q.meterType);
  addTable('Used for', OPT.use, 'exact', Q.use);
  addTable('Problems (last 3 months)', OPT.problems, 'contains', Q.problems);
  addTable('Power cuts', OPT.outage, 'exact', Q.outage);
  addTable('Monthly cost (prepaid)', OPT.money, 'exact', Q.ppMonthly);
  addTable('Monthly cost (estimate)', OPT.money, 'exact', Q.estMonthly);
  addTable('Happiness (1–5)', [1, 2, 3, 4, 5], 'exact', Q.rating);
  addTable('Division', OPT.divisions, 'exact', Q.division);
  sh.setColumnWidth(10, 300);

  // Charts (placed on the left, two per row)
  const palette = ['#2563EB', '#0D9488', '#F59E0B', '#DB2777', '#7C3AED', '#16A34A', '#EF4444', '#64748B'];
  const chartSpecs = [
    [0, Charts.ChartType.PIE, '🏢 Which company?', { pieHole: 0.45 }],
    [1, Charts.ChartType.PIE, '💳 Prepaid vs Postpaid', { pieHole: 0.45 }],
    [3, Charts.ChartType.BAR, '🛠️ Problems faced', { legend: { position: 'none' } }],
    [4, Charts.ChartType.COLUMN, '🌑 How often power goes off', { legend: { position: 'none' } }],
    [2, Charts.ChartType.COLUMN, '🏠 Connection used for', { legend: { position: 'none' } }],
    [8, Charts.ChartType.COLUMN, '🗺️ Responses by division', { legend: { position: 'none' } }],
    [5, Charts.ChartType.COLUMN, '💸 Monthly recharge (prepaid)', { legend: { position: 'none' } }],
    [7, Charts.ChartType.COLUMN, '😊 Happiness score', { legend: { position: 'none' } }],
  ];
  chartSpecs.forEach(function (spec, i) {
    const b = sh.newChart().setChartType(spec[1]).addRange(tables[spec[0]].range)
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
// 8. 📘 FIELD GUIDE — which question fills which column
// ===================================================================
function buildFieldGuide_(ss) {
  const sh = ss.insertSheet('📘 Field Guide');
  const rows = [
    ['Form question', 'Database table.column', 'How we use it'],
    [Q.name, 'customers.full_name', 'Copied as typed'],
    [Q.phone, 'customers.phone', 'Changed to +8801XXXXXXXXX ("Not given" if empty)'],
    [Q.email, 'customers.email', 'Copied (empty allowed)'],
    [Q.area + ' + ' + Q.division, 'customers.address', '"Area, Division, Bangladesh"'],
    [Q.use, 'customers.customer_type', 'Home → Residential; shop/factory/farm → Commercial'],
    ['(made by the sheet)', 'customers.customer_number', CONFIG.customerPrefix + '0001, 0002 …'],
    [Q.billMeter + ' / ' + Q.ppMeter, 'connections.meter_number', 'Spaces removed; if empty → ' + CONFIG.meterPrefix + '0001 …'],
    [Q.phase, 'connections.connection_type', 'Three phase → Three Phase; others → Single Phase'],
    [Q.since, 'connections.installation_date', 'Survey date minus the middle of the range (approximate)'],
    [Q.provider + ' + ' + Q.meterType, 'connections.notes', 'e.g. "DESCO · Prepaid · from survey"'],
    [Q.billPrev + ' / ' + Q.billPres, 'meter_readings.previous_reading / current_reading', 'Real numbers from the bill → status Verified'],
    [Q.ppKwh + ' + monthly cost', 'meter_readings (estimated)', 'previous = screen kWh − estimated units → status Pending'],
    [Q.billMonth, 'meter_readings.reading_date', 'Last day of that month'],
    [Q.billAmount + ' / ' + Q.billPaid, 'bills (check only)', 'Bills are made by our SQL bill function; these numbers are for checking it'],
    [Q.payMethod, 'payments.method', 'bKash/Nagad → Mobile Banking, Bank → Bank Transfer, Cash, Card, Other'],
    [Q.problems, 'service_requests.category', 'First problem ticked (see mapping in the script)'],
    [Q.outage, 'service_requests.priority', 'Rarely→Low, weekly→Medium, daily→High, many times a day→Critical'],
    [Q.story, 'service_requests.description', 'Copied; if empty we write "Reported in survey: …"'],
    [Q.people + ', ' + Q.appliances + ', ' + Q.rating, '(survey only)', 'Used for the dashboard and to sanity-check units'],
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

function buildDatabaseSheets_(ss) {
  const db = ss.insertSheet('🗄️ Database Ready');
  db.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS])
    .setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');
  db.setFrozenRows(1);
  const sql = ss.insertSheet('🧾 SQL Inserts');
  sql.getRange('A1').setValue('Copy column A (from row 3 down) into pgAdmin / Supabase SQL editor and run it. Safe to run again: duplicates are skipped.')
    .setFontWeight('bold').setBackground('#FEF3C7');
  sql.setColumnWidth(1, 1100);
  rebuildDatabaseSheet();
}

/**
 * Re-reads ALL answers and rewrites the 🗄️ Database Ready and 🧾 SQL Inserts tabs.
 * Runs automatically after every form submit. You can also run it by hand.
 */
function rebuildDatabaseSheet() {
  const ss = getSpreadsheet_();
  // We read the answers straight from the FORM (not the sheet), so numbers such as
  // meter "0123 4567 890" keep their leading zeros exactly as people typed them.
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  const rows = form.getResponses().map(function (resp) {
    const answers = { _time: resp.getTimestamp() };
    resp.getItemResponses().forEach(function (ir) {
      const v = ir.getResponse();
      answers[ir.getItem().getTitle()] = Array.isArray(v) ? v.join(', ') : String(v);
    });
    return answers;
  });
  const get = function (row, title) {
    const v = row[title];
    return v === undefined || v === null ? '' : String(v).trim();
  };

  const out = [];
  const sqlLines = [];
  const seenMeters = {};
  let n = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (get(row, Q.consent) !== OPT.consentYes) continue;    // no consent → skip
    n++;
    const notes = [];
    const submitted = new Date(row._time);
    const custNo = CONFIG.customerPrefix + pad_(n, 4);

    // ----- customers -----
    const fullName = (get(row, Q.name) || 'Survey Respondent ' + n).slice(0, 100);
    const phone = cleanPhone_(get(row, Q.phone));
    const email = get(row, Q.email);
    const address = [get(row, Q.area), get(row, Q.division), 'Bangladesh'].filter(String).join(', ');
    const use = get(row, Q.use);
    const customerType = use.indexOf('Home') >= 0 ? 'Residential' : 'Commercial';

    // ----- connections -----
    let meter = (get(row, Q.billMeter) || get(row, Q.ppMeter)).replace(/[\s-]/g, '').toUpperCase();
    let meterIsReal = 'yes';
    if (meter.length > 20) { notes.push('meter no too long, cut to 20'); meter = meter.slice(0, 20); }
    if (!meter) { meter = CONFIG.meterPrefix + pad_(n, 4); meterIsReal = 'no (made up)'; }
    const duplicateMeter = !!seenMeters[meter];
    if (duplicateMeter) notes.push('same meter as ' + seenMeters[meter] + ' (duplicate?), reading NOT exported');
    seenMeters[meter] = custNo;
    const phaseAns = get(row, Q.phase);
    const connectionType = phaseAns.indexOf('Three') === 0 ? 'Three Phase' : 'Single Phase';
    if (phaseAns.indexOf('Not sure') >= 0) notes.push('phase guessed');
    const sinceAns = get(row, Q.since) || 'Not sure';
    const years = MAP.sinceYears[sinceAns] || 3;
    const install = new Date(submitted.getTime() - years * 365.25 * 24 * 3600 * 1000);
    install.setDate(1);
    const provider = get(row, Q.provider).split(' (')[0];
    const meterTypeAns = get(row, Q.meterType);
    const meterType = meterTypeAns.indexOf('Prepaid') >= 0 ? 'Prepaid' : meterTypeAns.indexOf('Postpaid') >= 0 ? 'Postpaid' : 'Not sure';

    // ----- money & estimated units -----
    const moneyRange = get(row, Q.ppMonthly) || get(row, Q.estMonthly);
    let estUnits = '';
    if (MAP.moneyMid[moneyRange]) estUnits = Math.round(MAP.moneyMid[moneyRange] / CONFIG.takaPerUnit);
    else if (MAP.levelUnits[get(row, Q.estLevel)]) estUnits = MAP.levelUnits[get(row, Q.estLevel)];

    // ----- meter_readings -----
    let prev = num_(get(row, Q.billPrev));
    let cur = num_(get(row, Q.billPres));
    let readingDate = '';
    let readingStatus = '';
    const route = get(row, Q.route);
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

    // ----- bills (for checking) -----
    const billAmount = num_(get(row, Q.billAmount));
    const billStatus = MAP.billPaidToStatus[get(row, Q.billPaid)] || '';

    // ----- payments -----
    const payAns = get(row, Q.payMethod);
    let payMethod = '';
    if (payAns) {
      const first = Object.keys(MAP.payToMethod).filter(function (k) { return payAns.indexOf(k) >= 0; })[0];
      payMethod = first ? MAP.payToMethod[first] : 'Other';
    }

    // ----- service_requests -----
    const probAns = get(row, Q.problems);
    const probList = OPT.problems.filter(function (p) { return probAns.indexOf(p) >= 0 && MAP.problemToCategory[p]; });
    const category = probList.length ? MAP.problemToCategory[probList[0]] : '';
    const priority = MAP.outageToPriority[get(row, Q.outage)] || 'Medium';
    const story = get(row, Q.story);
    const description = story || (probList.length ? 'Reported in survey: ' + probList.map(function (p) { return MAP.problemToCategory[p]; }).join(', ') : '');

    if (route.indexOf('estimate') >= 0) notes.push('estimate only');

    out.push([
      Utilities.formatDate(submitted, 'Asia/Dhaka', 'yyyy-MM-dd HH:mm'), custNo, fullName, phone, email, address, customerType,
      meter, meterIsReal, connectionType, Utilities.formatDate(install, 'Asia/Dhaka', 'yyyy-MM-dd'), provider, meterType,
      prev, cur, units, readingDate, readingStatus, estUnits,
      billAmount, billStatus, moneyRange, payMethod,
      category, probList.map(function (p) { return MAP.problemToCategory[p]; }).join(', '), category ? priority : '', description,
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

  // Write 🗄️ Database Ready
  const db = ss.getSheetByName('🗄️ Database Ready');
  if (db.getLastRow() > 1) db.getRange(2, 1, db.getLastRow() - 1, DB_HEADERS.length).clearContent();
  if (out.length) db.getRange(2, 1, out.length, DB_HEADERS.length).setValues(out);

  // Write 🧾 SQL Inserts
  const sql = ss.getSheetByName('🧾 SQL Inserts');
  if (sql.getLastRow() > 2) sql.getRange(3, 1, sql.getLastRow() - 2, 1).clearContent();
  if (sqlLines.length) sql.getRange(3, 1, sqlLines.length, 1).setValues(sqlLines);
}

// ===================================================================
// 10. SMALL HELPERS
// ===================================================================
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

// Turn "This month / Last month / 2 months ago" into the last day of that month
function monthEnd_(submitted, answer) {
  const back = { 'This month': 0, 'Last month': 1, '2 months ago': 2 }[answer];
  if (back === undefined) return Utilities.formatDate(submitted, 'Asia/Dhaka', 'yyyy-MM-dd');
  if (back === 0) return Utilities.formatDate(submitted, 'Asia/Dhaka', 'yyyy-MM-dd');
  const d = new Date(submitted.getFullYear(), submitted.getMonth() - back + 1, 0); // day 0 = last day of previous month
  return Utilities.formatDate(d, 'Asia/Dhaka', 'yyyy-MM-dd');
}
