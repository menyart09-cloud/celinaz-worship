import { SearchClient } from "./search-client";

export default function SearchPage() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Search</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Switch how you&apos;re searching any time — the pill stays put, the results change.
        </p>
      </div>
      <SearchClient />
    </div>
  );
}
