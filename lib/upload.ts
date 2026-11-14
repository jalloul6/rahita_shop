"use client";

import { createClient } from "@/lib/supabase/client";
import { IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/products";

// Uploads an image straight to Storage with the admin's session (bucket RLS allows admins only).
// The file name is random, never user-supplied. Returns the public URL or an error message.
export async function uploadImage(file: File, folder = ""): Promise<{ url?: string; error?: string }> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Use a JPG, PNG or WebP image." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image must be 5 MB or smaller." };

  const supabase = createClient();
  const path = `${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { error: error.message };
  return { url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}
