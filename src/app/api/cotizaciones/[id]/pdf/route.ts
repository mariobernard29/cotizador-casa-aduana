import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { renderQuotePdf } from "@/server/pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cotizaciones/:id/pdf            → PDF generado con los datos actuales guardados
 * GET /api/cotizaciones/:id/pdf?download=1 → descarga
 * GET /api/cotizaciones/:id/pdf?version=N  → PDF archivado de la versión enviada N
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user.userId || !user.profile?.active) return new NextResponse("No autorizado", { status: 401 });

  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";
  const version = request.nextUrl.searchParams.get("version");

  let body: Buffer | Blob;
  let filename: string;

  if (version) {
    const supabase = await createClient();
    const { data: rev } = await supabase
      .from("quote_revisions")
      .select("pdf_path")
      .eq("quote_id", id)
      .eq("version", Number(version))
      .maybeSingle<{ pdf_path: string | null }>();
    if (!rev?.pdf_path) return new NextResponse("Versión no encontrada", { status: 404 });
    const { data, error } = await supabase.storage.from("quotes").download(rev.pdf_path);
    if (error || !data) return new NextResponse("Archivo no disponible", { status: 404 });
    body = data;
    filename = rev.pdf_path.replace("/", "-");
  } else {
    const pdf = await renderQuotePdf(id);
    if (!pdf) return new NextResponse("Cotización no encontrada", { status: 404 });
    body = pdf.buffer;
    filename = `${pdf.folio}${pdf.version > 1 ? `-v${pdf.version}` : ""}.pdf`;
  }

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Cotizacion-${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
