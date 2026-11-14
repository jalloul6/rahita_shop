"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { TrackResult } from "@/types/database";

export type TrackState = { error?: string; order?: TrackResult; ref?: string; phone?: string };

// Looks an order up through track_order(), which only answers when the reference AND phone match.
// The phone stays in the POST body (never in the URL).
export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const t = await getDictionary();
  const ref = String(formData.get("ref") ?? "").trim().slice(0, 30);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);

  if (!/\d{4,}/.test(ref) || phone.replace(/\D/g, "").length < 7) {
    return { error: t.track.invalid, ref, phone };
  }

  const { data, error } = await createPublicClient().rpc("track_order", { p_ref: ref, p_phone: phone });
  if (error) {
    console.error("track_order failed", error);
    return { error: t.track.notFound, ref, phone };
  }
  if (!data) return { error: t.track.notFound, ref, phone };
  return { order: data, ref, phone };
}
