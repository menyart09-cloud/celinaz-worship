import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/sign-in" });
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt"
      >
        Sign out
      </button>
    </form>
  );
}
