import { NextResponse } from "next/server";
import { getVersion } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ vid: string }> }
) {
  const { vid } = await params;
  const version = getVersion(vid);
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(version);
}
