"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";

const GraphView = dynamic(
  () => import("@/components/graph/GraphView").then((m) => m.GraphView),
  { ssr: false, loading: () => <GraphSkeleton /> }
);

function GraphSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0f1117] text-muted-foreground text-sm">
      Loading graph…
    </div>
  );
}

function GraphPageInner() {
  const params = useSearchParams();
  const activeNoteId = params.get("note") ?? undefined;
  return (
    <div className="w-full h-full">
      <GraphView activeNoteId={activeNoteId} />
    </div>
  );
}

export default function GraphPage() {
  return (
    <AppShell>
      <Suspense fallback={<GraphSkeleton />}>
        <GraphPageInner />
      </Suspense>
    </AppShell>
  );
}
