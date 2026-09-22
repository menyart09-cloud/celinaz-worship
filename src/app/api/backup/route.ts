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
