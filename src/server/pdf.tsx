import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getQuote, getSettings } from "@/server/queries";
import { QuoteDocument } from "@/pdf/QuoteDocument";
import type { ActionResult } from "@/lib/types";

let logoCache: Buffer | null | undefined;
async function loadLogo(): Promise<Buffer | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = await fs.readFile(path.join(process.cwd(), "public", "brand", "logo@4x.png"));
  } catch {
    logoCache = null;
  }
  return logoCache;
}

/** Genera el PDF a partir de los datos guardados de la cotización (nunca del navegador). */
export async function renderQuotePdf(quoteId: string): Promise<{ buffer: Buffer; folio: string; version: number } | null> {
  const [detail, settings, logo] = await Promise.all([getQuote(quoteId), getSettings(), loadLogo()]);
  if (!detail || !settings) return null;
  const buffer = await renderToBuffer(
    <QuoteDocument
      quote={detail.quote}
      lines={detail.lines}
      spaces={detail.spaces}
      settings={settings}
      menuName={detail.menuName}
      logo={logo}
    />,
  );
  return { buffer, folio: detail.quote.folio, version: detail.quote.version };
}

/** Guarda en Storage el PDF de la versión enviada. */
export async function archiveQuotePdf(quoteId: string): Promise<ActionResult<{ path: string }>> {
  const pdf = await renderQuotePdf(quoteId);
  if (!pdf) return { ok: false, error: "Cotización no encontrada" };
  const filePath = `${pdf.folio}/v${pdf.version}.pdf`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("quotes").upload(filePath, pdf.buffer, { contentType: "application/pdf", upsert: true });
  if (error) return { ok: false, error: error.message };
  await supabase.from("quote_revisions").update({ pdf_path: filePath }).eq("quote_id", quoteId).eq("version", pdf.version);
  return { ok: true, data: { path: filePath } };
}
