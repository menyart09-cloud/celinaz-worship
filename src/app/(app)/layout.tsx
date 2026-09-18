import Image from "next/image";
import { Suspense } from "react";
import { NavPills } from "./_components/nav-pills";
import { SignOutButton } from "./sign-out-button";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 pb-10">
      <div className="no-print sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-background pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
          <h1 className="text-xl font-bold">Worship Set Planner</h1>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
        <Suspense fallback={null}>
          <NavPills />
        </Suspense>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
