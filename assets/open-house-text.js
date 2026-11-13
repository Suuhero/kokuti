const escapeHTML = (text) => String(text ?? "").replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const numeric = (value) => Number(value.replace(/[０-９]/g, (digit) =>
  String(digit.charCodeAt(0) - 0xff10)));
const validTime = (hour, minute) => numeric(minute) < 60 &&
  (numeric(hour) < 24 || (numeric(hour) === 24 && numeric(minute) === 0));

function dateTextHTML(text, offset) {
  const dates = /(?:([0-9０-９]{1,2})月)?([0-9０-９]{1,2})日(?:[（(][月火水木金土日祝][）)])?/g;
  let html = "", cursor = 0;
  for (const match of text.matchAll(dates)) {
    if (/[0-9０-９]/.test(text[match.index - 1] || "") ||
        (match[1] && (numeric(match[1]) < 1 || numeric(match[1]) > 12)) ||
        numeric(match[2]) < 1 || numeric(match[2]) > 31) continue;
    html += escapeHTML(text.slice(cursor, match.index)) +
      (offset + match.index ? "<wbr>" : "") +
      '<span class="opening-date">' + escapeHTML(match[0]) + "</span>";
    cursor = match.index + match[0].length;
  }
  return html + escapeHTML(text.slice(cursor));
}

// Keep each date/day and time range together without changing source text.
export function openingTextHTML(value) {
  const text = String(value ?? "");
  const times = /([0-9０-９]{1,2})[:：]([0-9０-９]{2})(?:[ \t　]*[〜～~–—−－-][ \t　]*([0-9０-９]{1,2})[:：]([0-9０-９]{2}))?(?![0-9０-９])/g;
  let html = "", cursor = 0;
  for (const match of text.matchAll(times)) {
    if (/[0-9０-９]/.test(text[match.index - 1] || "") ||
        !validTime(match[1], match[2]) ||
        (match[3] && !validTime(match[3], match[4]))) continue;
    html += dateTextHTML(text.slice(cursor, match.index), cursor) +
      (match.index ? "<wbr>" : "") +
      '<span class="opening-time">' + escapeHTML(match[0]) + "</span>";
    cursor = match.index + match[0].length;
  }
  return html + dateTextHTML(text.slice(cursor), cursor);
}
