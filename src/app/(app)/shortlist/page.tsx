import { getShortlist } from "@/lib/queries";
import { ShortlistClient } from "./shortlist-client";

export const dynamic = "force-dynamic";

export default async function ShortlistPage() {
  const rows = await getShortlist();
  const items = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Shortlist</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Songs you might want to use someday — not part of the log yet. Click one to slot it into
          an upcoming service.
        </p>
      </div>
      <ShortlistClient items={items} />
    </div>
  );
}
