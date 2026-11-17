/**
 * Baithak Club guestlist endpoint.
 *
 * Bound to the "Baithak Club Guestlist" spreadsheet (Extensions → Apps Script).
 * Deploy → New deployment → Web app: Execute as "Me", Who has access "Anyone".
 *
 * Writes one row per application to the "Applications" tab, in this order:
 * Timestamp | Full Name | Phone | Email | Age | Gender | City | Instagram |
 * Profession | Why Join | Source | Event | Status | Notes
 *
 * Accepts application/x-www-form-urlencoded (what the site sends) or a JSON body.
 */
const SHEET_NAME = 'Applications';
const MIN_AGE = 18;
const MAX_AGE = 35;
const DEFAULT_EVENT = 'Bonfire Night — Sat 21 Nov 2026, Gaur City';
const HEADERS = [
  'Timestamp', 'Full Name', 'Phone', 'Email', 'Age', 'Gender', 'City', 'Instagram',
  'Profession', 'Why Join', 'Source', 'Event', 'Status', 'Notes'
];
const PHONE_COL = 3; // column C
const EVENT_COL = 12; // column L
const FRIENDLY_ERROR = 'Something went wrong on our side. Please try again in a minute, or DM us on Instagram.';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = parseBody_(e);

    // Honeypot: bots fill hidden fields. Pretend success, write nothing.
    if (pick_(data, 'company', 'website')) {
      return respond_({ ok: true, status: 'Pending', message: 'Application received.' });
    }

    const row = normalize_(data);

    const missing = ['fullName', 'phone', 'email', 'age', 'instagram'].filter(function (k) { return !row[k]; });
    if (missing.length) {
      return respond_({ ok: false, error: 'Please fill in every field and try again.' });
    }
    if (!isTruthy_(pick_(data, 'consent'))) {
      return respond_({ ok: false, error: 'Please tick the consent box before sending.' });
    }

    const ageNum = Number(row.age);
    const ageInvalid = !Number.isFinite(ageNum) || ageNum < MIN_AGE || ageNum > MAX_AGE;
    const status = ageInvalid ? 'Rejected' : 'Pending';
    const notes = [];
    if (ageInvalid) notes.push('Flagged: age outside 18–35');

    lock.waitLock(10000);
    const sheet = getSheet_();

    if (isDuplicate_(sheet, row.phone, row.event)) notes.push('Possible duplicate (same phone + event)');

    sheet.appendRow([
      new Date(),
      safe_(row.fullName),
      safe_(row.phone),
      safe_(row.email),
      Number.isFinite(ageNum) ? ageNum : safe_(row.age),
      safe_(row.gender),
      safe_(row.city),
      safe_(row.instagram),
      safe_(row.profession),
      safe_(row.whyJoin),
      safe_(row.source),
      safe_(row.event),
      status,
      notes.join(' · ')
    ]);
    SpreadsheetApp.flush();

    if (ageInvalid) {
      return respond_({
        ok: false,
        status: status,
        error: 'This baithak is for ages 18–35. Your details were recorded but cannot be approved.'
      });
    }

    return respond_({
      ok: true,
      status: status,
      message: 'Application received. We will review your Instagram and WhatsApp you if you make the list.'
    });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err); // visible under Executions, never sent to the browser
    return respond_({ ok: false, error: FRIENDLY_ERROR });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function doGet() {
  return respond_({ ok: true, message: 'Baithak Club guestlist endpoint is live.' });
}

/**
 * Run once from the editor (select "setup" → Run). It authorises the script
 * and makes sure the Applications tab and header row exist.
 */
function setup() {
  const sheet = getSheet_();
  Logger.log('Ready: "%s" has %s rows.', sheet.getName(), sheet.getLastRow());
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function isDuplicate_(sheet, phone, event) {
  const last = sheet.getLastRow();
  if (last < 2 || !phone) return false;
  const digits = digits_(phone);
  const phones = sheet.getRange(2, PHONE_COL, last - 1, 1).getValues();
  const events = sheet.getRange(2, EVENT_COL, last - 1, 1).getValues();
  for (var i = 0; i < phones.length; i++) {
    if (digits_(phones[i][0]) === digits && String(events[i][0]) === event) return true;
  }
  return false;
}

function parseBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    var contents = String(e.postData.contents).trim();
    var type = String((e.postData.type || '')).toLowerCase();
    if (type.indexOf('application/json') !== -1 || (contents.charAt(0) === '{' && contents.slice(-1) === '}')) {
      try {
        return JSON.parse(contents);
      } catch (err) {
        // fall through to form parameters
      }
    }
  }
  return e.parameter || {};
}

function normalize_(d) {
  d = d || {};
  return {
    fullName: pick_(d, 'fullName', 'full_name', 'name'),
    phone: pick_(d, 'phone', 'whatsapp', 'Phone'),
    email: pick_(d, 'email', 'Email').toLowerCase(),
    age: pick_(d, 'age', 'Age'),
    gender: pick_(d, 'gender', 'Gender'),
    city: pick_(d, 'city', 'City'),
    instagram: pick_(d, 'instagram', 'instagramHandle', 'ig').replace(/^@+/, ''),
    profession: pick_(d, 'profession', 'Profession'),
    whyJoin: pick_(d, 'whyJoin', 'why_join', 'why'),
    source: pick_(d, 'source', 'howHeard', 'how_did_you_hear'),
    event: pick_(d, 'event', 'Event') || DEFAULT_EVENT
  };
}

function pick_(d) {
  for (var i = 1; i < arguments.length; i++) {
    var key = arguments[i];
    if (d[key] !== undefined && d[key] !== null && String(d[key]).trim() !== '') {
      return String(d[key]).trim();
    }
  }
  return '';
}

// A leading apostrophe makes Sheets store the value as plain text, so "+91…"
// stays a phone number and "=SOMETHING()" can never run as a formula.
function safe_(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function isTruthy_(v) {
  return ['true', 'yes', 'on', '1'].indexOf(String(v).toLowerCase()) !== -1;
}

function digits_(v) {
  var s = String(v).replace(/\D/g, '');
  return s.length > 10 ? s.slice(-10) : s;
}

function respond_(obj) {
  // The site POSTs application/x-www-form-urlencoded (a CORS "simple request"),
  // so the browser sends no preflight. Apps Script answers with a redirect to
  // script.googleusercontent.com, which serves this JSON with
  // Access-Control-Allow-Origin: *, so fetch() can read { ok, error }.
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
