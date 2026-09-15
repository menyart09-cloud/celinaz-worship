import { getSongLibrary } from "@/lib/queries";
import { SongsTable } from "./songs-table";

export const dynamic = "force-dynamic";

export default async function SongsPage() {
  const songs = await getSongLibrary();

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Song Library</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Every hymn and chorus you&apos;ve actually used. Click a column to sort, click a song to
          queue it for a future service. Songs you&apos;re only considering belong on the
          Shortlist.
        </p>
      </div>
      <SongsTable songs={songs} />
    </div>
  );
}
