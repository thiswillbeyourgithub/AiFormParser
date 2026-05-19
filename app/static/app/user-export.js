// CSV + XLSX export of the per-upload results. One row per uploaded
// survey; columns are the unique `header` values in the YAML order
// (uniqueness is enforced at admin save). multi-select cells join
// their picks with the delimiter below.

const XLSX_SCRIPT = "/static/vendor/xlsx/xlsx.mini.min.js";
const MULTI_SELECT_DELIMITER = ";";

let xlsxLoading = null;
async function loadXlsx() {
  if (typeof window.XLSX !== "undefined") return window.XLSX;
  if (xlsxLoading) return xlsxLoading;
  xlsxLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = XLSX_SCRIPT;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error("Failed to load SheetJS"));
    document.head.appendChild(s);
  });
  return xlsxLoading;
}

export function buildColumns(template) {
  return template.survey.pages.flatMap((p) => p.boxes.map((b) => b.header));
}

export function buildRows(state) {
  const columns = buildColumns(state.template);
  const rows = [];
  for (const upload of state.uploads) {
    if (!upload.perBoxResults) continue;
    const row = { __filename: upload.file.name };
    for (const col of columns) row[col] = "";
    for (const entry of upload.perBoxResults.values()) {
      if (entry.resolution === "skip") continue;
      const v = entry.value;
      if (v == null) continue;
      if (Array.isArray(v)) row[entry.header] = v.join(MULTI_SELECT_DELIMITER);
      else if (typeof v === "boolean") row[entry.header] = v ? "true" : "false";
      else row[entry.header] = String(v);
    }
    rows.push(row);
  }
  return { columns, rows };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function exportCsv(state) {
  const { columns, rows } = buildRows(state);
  const lines = [columns.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c] ?? "")).join(","));
  }
  const text = lines.join("\n") + "\n";
  return new Blob([text], { type: "text/csv;charset=utf-8" });
}

export async function exportXlsx(state) {
  const XLSX = await loadXlsx();
  const { columns, rows } = buildRows(state);
  const aoa = [columns, ...rows.map((r) => columns.map((c) => r[c] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Surveys");
  const bin = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([bin], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}
