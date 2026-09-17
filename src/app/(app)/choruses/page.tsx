import { getChoruses } from "@/lib/queries";
import { ChorusesClient } from "./choruses-client";

export const dynamic = "force-dynamic";

export default async function ChorusesPage() {
  const rows = await getChoruses();
  const items = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Choruses</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Your standing chorus list. Click one to slot it into an upcoming service.
        </p>
      </div>
      <ChorusesClient items={items} />
    </div>
  );
}
