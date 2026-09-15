import { getSongLibrary } from "@/lib/queries";
import { AddServiceForm } from "./add-service-form";

export const dynamic = "force-dynamic";

export default async function AddServicePage() {
  const library = await getSongLibrary();

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Add Service</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Song titles autocomplete from your Song Library as you type.
        </p>
      </div>
      <datalist id="song-title-options">
        {library.map((s) => (
          <option key={s.id} value={s.title} />
        ))}
      </datalist>
      <AddServiceForm />
    </div>
  );
}
