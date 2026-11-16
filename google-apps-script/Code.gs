/**
 * Backend for «Kommer du?»-tavla.
 * Lagrer svarene i fanen «Svar» i regnearket dette scriptet hører til.
 *
 * GET  -> { ok: true, gjester: [{ navn, hilsen, tid }] }
 * POST -> legger til en rad og svarer med hele lista (samme format)
 *
 * Du kan rette eller slette rader direkte i regnearket – tavla oppdateres
 * neste gang noen laster siden.
 */

const SHEET_NAME = "Svar";
const MAX_NAVN = 60;
const MAX_HILSEN = 400;

function doGet() {
  return json_({ ok: true, gjester: list_() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Felle for spam-roboter: mennesker ser ikke dette feltet
    if (data.website) return json_({ ok: true, gjester: list_() });

    const navn = clean_(data.navn, MAX_NAVN);
    const hilsen = clean_(data.hilsen, MAX_HILSEN);
    if (!navn) return json_({ ok: false, feil: "Mangler navn" });

    sheet_().appendRow([new Date(), safe_(navn), safe_(hilsen)]);
    return json_({ ok: true, gjester: list_() });
  } catch (err) {
    return json_({ ok: false, feil: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["Tidspunkt", "Navn", "Hilsen"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function list_() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  return rows
    .filter((r) => String(r[1]).trim())
    .map((r) => ({
      navn: String(r[1]),
      hilsen: String(r[2] || ""),
      tid: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    }));
}

// Fjerner kontrolltegn (men beholder linjeskift) og kutter lengden
function clean_(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

// Hindrer at tekst som starter med = + - @ blir tolket som en formel i regnearket
function safe_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
