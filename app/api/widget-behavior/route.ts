import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * widget_behavior de un workspace (por ahora solo show_reset_button), para el widget.
 *
 * Antes el navegador lo leía directo con la clave anon; ahora lo sirve el servidor con
 * service_role. Es un booleano de UI, no información sensible.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = Number(searchParams.get("workspaceId"));

  if (!Number.isFinite(workspaceId)) {
    return NextResponse.json({ show_reset_button: true });
  }

  try {
    const { data } = await supabaseServer
      .from("widget_behavior")
      .select("show_reset_button")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    return NextResponse.json(
      { show_reset_button: data?.show_reset_button !== false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ show_reset_button: true });
  }
}
