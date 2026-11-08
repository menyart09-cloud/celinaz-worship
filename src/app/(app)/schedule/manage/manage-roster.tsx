"use client";

import { useState, useTransition } from "react";
import type { SoundBoothRosterRow } from "@/lib/sound-booth/helpers";
import { addSoundBoothRosterMemberAction, setSoundBoothPhoneAction, setSoundBoothPinAction } from "@/lib/sound-booth/actions";

// The PIN is bcrypt-hashed at rest, so once saved there's no way to show it
// back after a reload — only kept here, in memory, for the rest of this
// browser session, which is what makes "Text it"/"Copy message" possible
// right after setting it. Re-enter a new PIN to text/copy again later.
type KnownPins = Record<string, string>;

function buildMessage(name: string, pin: string) {
  return `Hey ${name} — go to https://celinaz-worship.app/team and sign in as ${name}, PIN ${pin}.`;
}

function RosterRow({ member, knownPin, onPinSaved }: { member: SoundBoothRosterRow; knownPin: string | undefined; onPinSaved: (pin: string) => void }) {
  const [pinInput, setPinInput] = useState("");
  const [phoneInput, setPhoneInput] = useState(member.phone ?? "");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function savePin() {
    const value = pinInput.trim();
    if (!value) return;
    startTransition(async () => {
      await setSoundBoothPinAction(member.id, value);
      onPinSaved(value);
      setSent(false);
    });
  }

  function savePhone() {
    startTransition(async () => {
      await setSoundBoothPhoneAction(member.id, phoneInput);
    });
  }

  const message = knownPin ? buildMessage(member.name, knownPin) : null;
  const canText = !!message && !!phoneInput.trim();

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Clipboard access can be refused (older browsers, some embedded
      // views) — the message is still visible to select and copy by hand.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="border-t border-border p-3.5 first:border-t-0">
      <div className="flex items-center gap-2.5">
        <div className="min-w-16 font-bold">{member.name}</div>
        <div className={"flex-1 text-xs " + (member.hasPin ? "font-bold text-good" : "italic text-text-faint")}>
          {member.hasPin ? "PIN active" : "No access yet"}
        </div>
      </div>
      <div className="mt-2.5 space-y-2 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="w-11 flex-none text-[0.72rem] font-bold tracking-wide text-text-muted uppercase">PIN</span>
          <input
            type="text"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Choose a PIN"
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 font-mono-tab text-sm font-bold tracking-wide text-foreground"
          />
          <button
            type="button"
            disabled={pending}
            onClick={savePin}
            className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Save
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-11 flex-none text-[0.72rem] font-bold tracking-wide text-text-muted uppercase">Phone</span>
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="(555) 555-5555"
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground"
          />
          <button
            type="button"
            disabled={pending}
            onClick={savePhone}
            className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Save
          </button>
        </div>

        {member.hasPin && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              type="button"
              disabled={!canText}
              onClick={() => setSent(true)}
              className="rounded-full border border-accent-strong bg-accent-strong px-3.5 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Text it to {member.name}
            </button>
            <button
              type="button"
              disabled={!message}
              onClick={copyMessage}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-bold " +
                (copied ? "border-good bg-good-soft text-good" : "border-border-strong bg-surface text-foreground")
              }
            >
              {copied ? "Copied" : "Copy message"}
            </button>
          </div>
        )}
        {!knownPin && member.hasPin && (
          <p className="pt-0.5 text-xs text-text-faint italic">Re-enter a PIN above to text or copy a new sign-in message.</p>
        )}
        {sent && message && (
          <div className="mt-2.5 border-t border-dashed border-border pt-2.5">
            <div className="mb-2 text-[0.74rem] font-bold tracking-wide text-text-muted uppercase">
              This is what opens, on a phone or a computer
            </div>
            <div className="w-[230px] rounded-2xl border border-border-strong bg-surface p-2.5 pb-3 shadow-sm">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border-strong" />
              <div className="mb-2.5 flex items-center gap-1 text-[0.76rem] font-bold">
                <span className="text-accent-strong">&lsaquo;</span>
                <span>New Message</span>
              </div>
              <div className="mb-2 border-b border-border pb-2 text-[0.7rem] text-text-muted">
                To: <span className="font-bold text-foreground">{phoneInput}</span>
              </div>
              <div className="h-[46px]" />
              <div className="flex items-end gap-1.5">
                <div className="min-w-0 flex-1 rounded-2xl border border-border-strong bg-surface-alt px-2.5 py-1.5 text-[0.7rem] leading-snug text-foreground">
                  {message}
                </div>
                <div className="flex h-5.5 w-5.5 flex-none items-center justify-center rounded-full bg-accent-strong text-sm font-bold text-white">
                  &uarr;
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ManageRoster({ roster }: { roster: SoundBoothRosterRow[] }) {
  const [knownPins, setKnownPins] = useState<KnownPins>({});
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  function addPerson() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      await addSoundBoothRosterMemberAction(name);
      setNewName("");
    });
  }

  return (
    <div className="mt-4 max-w-[560px] rounded-xl border border-border bg-surface">
      {roster.map((member) => (
        <RosterRow
          key={member.id}
          member={member}
          knownPin={knownPins[member.id]}
          onPinSaved={(pin) => setKnownPins((prev) => ({ ...prev, [member.id]: pin }))}
        />
      ))}
      <div className="border-t border-border bg-surface-alt p-3.5">
        <div className="flex items-center gap-2">
          <span className="w-11 flex-none text-[0.72rem] font-bold tracking-wide text-text-muted uppercase">Add</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPerson();
              }
            }}
            placeholder="New person&#8217;s name"
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground"
          />
          <button
            type="button"
            disabled={pending}
            onClick={addPerson}
            className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
