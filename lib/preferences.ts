import "server-only";
import { cookies } from "next/headers";
import { MODE_COOKIE, isColorMode, type ColorMode } from "@/lib/themes";

// Visitor's light/dark choice from the header toggle, or null if they never picked one.
// Request-time data: render inside <Suspense> (the storefront layout provides one).
export async function getColorMode(): Promise<ColorMode | null> {
  const value = (await cookies()).get(MODE_COOKIE)?.value;
  return isColorMode(value) ? value : null;
}
