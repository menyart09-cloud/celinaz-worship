"use client";

import { useActionState, useState } from "react";
import { teamSignInAction } from "./actions";

export function TeamSignIn({ names }: { names: string[] }) {
  const [name, setName] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState(teamSignInAction, undefined);

  return (
    <div>
      <h1 className="text-xl font-bold">Sound Booth</h1>
      <p className="mt-1 text-sm text-text-muted">Who are you?</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setName(n)}
            className={
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold " +
              (name === n ? "border-accent-strong bg-accent-strong text-white" : "border-border-strong bg-surface text-text-muted")
            }
          >
            {n}
          </button>
        ))}
      </div>

      {name && (
        <form action={formAction} className="mt-5">
          <input type="hidden" name="name" value={name} />
          <label className="block text-sm font-semibold text-text-muted">{name} &middot; enter your PIN</label>
          <input
            type="password"
            inputMode="numeric"
            name="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-lg tracking-widest text-foreground"
          />
          {state?.error && <p className="mt-2 text-sm font-semibold text-declined">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-3 w-full rounded-lg border border-accent bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
          >
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
