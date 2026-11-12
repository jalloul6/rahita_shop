// Meta Pixel + TikTok Pixel helpers. Everything is a no-op when the IDs are not set.

type Fbq = (...args: unknown[]) => void;
type Ttq = {
  page: () => void;
  track: (event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    ttq?: Ttq;
  }
}

// IDs are injected into inline scripts, so only accept their real formats.
function clean(value: string | undefined, pattern: RegExp) {
  const v = (value ?? "").trim();
  return pattern.test(v) ? v : "";
}

export const META_PIXEL_ID = clean(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d{5,20}$/);
export const TIKTOK_PIXEL_ID = clean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID, /^[A-Za-z0-9]{10,30}$/);
export const PIXELS_ENABLED = Boolean(META_PIXEL_ID || TIKTOK_PIXEL_ID);

// Tracking is for customers only, never the admin area.
export function isTrackedPath(pathname: string) {
  return !(pathname === "/login" || pathname === "/admin" || pathname.startsWith("/admin/"));
}

// The pixel snippets load after hydration; retry briefly so early events aren't dropped.
function whenReady(fn: () => void, tries = 20) {
  if (typeof window === "undefined") return;
  const ready = (!META_PIXEL_ID || window.fbq) && (!TIKTOK_PIXEL_ID || window.ttq);
  if (ready || tries <= 0) {
    try {
      fn();
    } catch (e) {
      console.warn("pixel event failed", e);
    }
    return;
  }
  setTimeout(() => whenReady(fn, tries - 1), 250);
}

export function trackPageView() {
  if (!PIXELS_ENABLED) return;
  whenReady(() => {
    if (META_PIXEL_ID) window.fbq?.("track", "PageView");
    if (TIKTOK_PIXEL_ID) window.ttq?.page();
  });
}

export function trackPurchase({ orderNumber, value, currency }: { orderNumber: string; value: number; currency: string }) {
  if (!PIXELS_ENABLED) return;

  // Fire once per order per tab, even if the confirmation page is refreshed.
  const key = `purchase-tracked-${orderNumber}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // storage blocked: still track, Meta also de-duplicates by eventID
  }

  whenReady(() => {
    if (META_PIXEL_ID) window.fbq?.("track", "Purchase", { value, currency }, { eventID: `order-${orderNumber}` });
    if (TIKTOK_PIXEL_ID) {
      window.ttq?.track("CompletePayment", { value, currency, content_type: "product" }, { event_id: `order-${orderNumber}` });
    }
  });
}
