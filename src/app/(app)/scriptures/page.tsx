import { getScriptureHistory } from "@/lib/queries";
import { ScriptureTable } from "./scripture-table";

export const dynamic = "force-dynamic";

export default async function ScripturesPage() {
  const rows = await getScriptureHistory();

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Scriptures</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Every scripture you&apos;ve keyed into the Order of Service&apos;s Scripture item, newest
          first — not the pastor&apos;s sermon passage, just what you&apos;ve used yourself.
        </p>
      </div>
      <ScriptureTable rows={rows} />
    </div>
  );
}
