import { teamSignOutAction } from "./actions";
import { TeamNav } from "./team-nav";

export function TeamHeader({ name }: { name: string }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent-strong text-[0.66rem] font-bold text-white">
          {name[0]}
        </span>
        Signed in as {name}
        <form action={teamSignOutAction} className="ml-auto">
          <button type="submit" className="text-xs font-semibold text-text-muted underline decoration-dotted underline-offset-2">
            Sign out
          </button>
        </form>
      </div>
      <TeamNav />
    </div>
  );
}
