import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { PurchaseTracker } from "@/components/analytics/purchase-tracker";
import { buttonVariants } from "@/components/ui/button";
import { ClearCart } from "@/components/storefront/clear-cart";
import { CopyButton } from "@/components/storefront/copy-button";
import { CURRENCY, formatMoney } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { isOrderRef } from "@/lib/orders";
import { getShopSettings } from "@/lib/data/storefront";
import { brandFor, waLink } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };

type Props = PageProps<"/order-confirmed/[number]">;

export default function OrderConfirmedPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <Confirmation params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Confirmation({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const [{ number }, query, t, settings, locale] = await Promise.all([
    params,
    searchParams,
    getDictionary(),
    getShopSettings(),
    getLocale(),
  ]);
  // The segment carries the customer-facing reference (e.g. RH-1042), never the raw sequence number.
  const ref = decodeURIComponent(number);
  const valid = isOrderRef(ref);

  // pm / total come from our own redirect after checkout. They only drive what this page shows
  // the customer (and the ad pixel); the real order amount lives in the database.
  const pm = query.pm === "whish" ? "whish" : "cod";
  const totalRaw = typeof query.total === "string" ? query.total : "";
  const total = /^\d{1,7}(\.\d{1,2})?$/.test(totalRaw) ? Number(totalRaw) : null;
  const totalText = total !== null ? formatMoney(total) : null;

  return (
    <div className="mx-auto max-w-lg space-y-5 rounded-3xl border bg-card px-6 py-12 text-center shadow-sm sm:px-10">
      <ClearCart />
      {valid && total !== null && <PurchaseTracker orderNumber={ref} value={total} currency={CURRENCY} />}

      <CheckCircle2 className="mx-auto size-14 text-green-600" />
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{t.confirm.title}</h1>
      <p className="text-muted-foreground">
        {valid ? (
          <>
            {t.confirm.receivedBefore}{" "}
            <bdi className="font-semibold text-foreground" dir="ltr">
              {ref}
            </bdi>{" "}
            {t.confirm.receivedAfter}
          </>
        ) : (
          t.confirm.receivedGeneric
        )}{" "}
        {pm === "cod" ? t.confirm.codNext : t.confirm.whishNext}
      </p>

      {valid && pm === "whish" && (
        <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-start">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t.confirm.step1(totalText)}</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-wider" dir="ltr">
                {settings.whishNumber}
              </span>
              <CopyButton value={settings.whishNumber} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{t.confirm.step2}</div>
            <a
              href={waLink(settings.whatsappNumber, t.confirm.whatsapp(brandFor(settings, locale).name, ref, totalText))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe5b]"
            >
              <MessageCircle className="size-5" />
              {t.confirm.sendReceipt}
            </a>
          </div>
        </div>
      )}

      <Link href="/products" className={cn(buttonVariants({ size: "lg", variant: pm === "whish" ? "outline" : "default" }))}>
        {t.confirm.continue}
      </Link>
    </div>
  );
}
