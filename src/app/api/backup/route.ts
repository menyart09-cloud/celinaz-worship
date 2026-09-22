import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllServices, getAllOosItemsForBackup } from "@/lib/queries";
import { todayIso } from "@/lib/dates";

// Not covered by the auth middleware (its matcher excludes /api), so the
// session check has to happen here instead.
export async function GET() {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [services, oosRows] = await Promise.all([getAllServices(), getAllOosItemsForBackup()]);

  const workbook = new ExcelJS.Workbook();

  // First sheet added is the one most spreadsheet apps open to — and unlike
  // anything written on the Maintenance page, these instructions travel
  // with the file itself, so they're still there even if the app and its
  // host are long gone.
  const readMe = workbook.addWorksheet("Read Me");
  readMe.getColumn(1).width = 100;
  readMe.getColumn(1).alignment = { wrapText: true, vertical: "top" };
  const readMeLines = [
    "Celinaz Worship — Backup Read Me",
    `Generated ${todayIso()}`,
    "",
    "WHAT THIS IS",
    "This spreadsheet is a full backup of everything in the Worship Set Planner as of the date above. The other two tabs are:",
    "  • Service Log — every service you've logged: date, sermon, scripture, note, and the songs sung.",
    "  • Order of Service — every run sheet you've saved: one row per item, with its label, assignee, notes, and songs.",
    "",
    "IF THE APP OR ITS HOST EVER GOES DOWN FOR GOOD",
    "This file is your safety net. If celinaz-worship.vercel.app is ever lost — hosting canceled, account lost, anything like that — this spreadsheet has everything needed to start over: your full service history and song library, ready to be re-entered into a new copy of the app or read on its own.",
    "",
    "WHAT TO DO WITH IT",
    "  • Save a copy somewhere that isn't just this computer — email it to yourself, or save it to Google Drive, iCloud, or Dropbox.",
    "  • Come back to the Maintenance tab every so often (monthly, or after a few Sundays) and download a fresh one — an old backup won't have your most recent services.",
    "  • Keep more than one dated copy if you can. If a recent one turns out incomplete, you'll have an older one to fall back on.",
  ];
  readMeLines.forEach((line, i) => {
    const row = readMe.addRow([line]);
    if (i === 0) row.font = { bold: true, size: 14 };
    else if (line === line.toUpperCase() && line.trim()) row.font = { bold: true };
  });

  const logSheet = workbook.addWorksheet("Service Log");
  logSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Sermon", key: "sermon", width: 32 },
    { header: "Scripture", key: "scripture", width: 20 },
    { header: "Note", key: "note", width: 28 },
    { header: "Setlist", key: "setlist", width: 65 },
  ];
  logSheet.getRow(1).font = { bold: true };
  for (const s of services) {
    logSheet.addRow({
      date: s.date,
      sermon: s.sermon ?? "",
      scripture: s.scripture ?? "",
      note: s.note ?? "",
      setlist: s.songs
        .map((sg) => `${sg.hymnNumber} - ${sg.title}${sg.verses ? ` (${sg.verses})` : ""}`)
        .join(" | "),
    });
  }

  const oosSheet = workbook.addWorksheet("Order of Service");
  oosSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Label", key: "label", width: 22 },
    { header: "Assignee", key: "assignee", width: 20 },
    { header: "Detail", key: "detail", width: 38 },
    { header: "Songs", key: "songs", width: 50 },
  ];
  oosSheet.getRow(1).font = { bold: true };
  for (const r of oosRows) {
    oosSheet.addRow({
      date: r.date,
      label: r.label,
      assignee: r.assignee ?? "",
      detail: r.detail ?? "",
      songs: r.songs.map((sg) => `${sg.hymnNumber} - ${sg.title}`).join(" | "),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="celinaz-worship-backup-${todayIso()}.xlsx"`,
    },
  });
}
