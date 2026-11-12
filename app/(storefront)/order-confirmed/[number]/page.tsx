import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { PurchaseTracker } from "@/components/analytics/purchase-tracker";
import { buttonVariants } from "@/components/ui/button";
import { ClearCart } from "@/components/storefront/clear-cart";
import { CopyButton } from "@/components/storefront/copy-button";
import { CURRENCY, formatMoney } from "@/lib/format";
import { SHOP_NAME, WHISH_NUMBER, whatsappLink } from "@/lib/shop";
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
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const valid = /^\d{1,12}$/.test(number) && number !== "0";

  // pm / total come from our own redirect after checkout. They only drive what this page shows
  // the customer (and the ad pixel); the real order amount lives in the database.
  const pm = query.pm === "whish" ? "whish" : "cod";
  const totalRaw = typeof query.total === "string" ? query.total : "";
  const total = /^\d{1,7}(\.\d{1,2})?$/.test(totalRaw) ? Number(totalRaw) : null;

  const message =
    `Hello ${SHOP_NAME}, I placed order #${number}` +
    (total !== null ? ` with a total of ${formatMoney(total)}` : "") +
    ` and paid via Whish Money. Here is my payment receipt.`;

  return (
    <div className="mx-auto max-w-lg space-y-5 rounded-3xl border bg-card px-6 py-12 text-center shadow-sm sm:px-10">
      <ClearCart />
      {valid && total !== null && <PurchaseTracker orderNumber={number} value={total} currency={CURRENCY} />}

      <CheckCircle2 className="mx-auto size-14 text-green-600" />
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Thank you!</h1>
      <p className="text-muted-foreground">
        {valid ? (
          <>
            Your order <span className="font-semibold text-foreground">#{number}</span> has been received.
          </>
        ) : (
          "Your order has been received."
        )}{" "}
        {pm === "cod"
          ? "We'll call you shortly to confirm it. Please have the cash ready when it arrives."
          : "We'll ship it as soon as your Whish payment is confirmed."}
      </p>

      {valid && pm === "whish" && (
        <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">1. Transfer {total !== null ? formatMoney(total) : "the total"} to</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-wider" dir="ltr">
                {WHISH_NUMBER}
              </span>
              <CopyButton value={WHISH_NUMBER} label="Copy number" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">2. Send us the payment receipt</div>
            <a
              href={whatsappLink(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe5b]"
            >
              <MessageCircle className="size-5" />
              Send payment receipt on WhatsApp
            </a>
          </div>
        </div>
      )}

      <Link href="/products" className={cn(buttonVariants({ size: "lg", variant: pm === "whish" ? "outline" : "default" }))}>
        Continue shopping
      </Link>
    </div>
  );
}
