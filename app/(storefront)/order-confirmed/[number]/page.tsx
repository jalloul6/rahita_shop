import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ClearCart } from "@/components/storefront/clear-cart";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };

export default function OrderConfirmedPage(props: PageProps<"/order-confirmed/[number]">) {
  return (
    <Suspense fallback={null}>
      <Confirmation params={props.params} />
    </Suspense>
  );
}

async function Confirmation({ params }: { params: PageProps<"/order-confirmed/[number]">["params"] }) {
  const { number } = await params;
  const valid = /^\d{1,12}$/.test(number) && number !== "0";

  return (
    <div className="mx-auto max-w-md space-y-5 py-12 text-center">
      <ClearCart />
      <CheckCircle2 className="mx-auto size-14 text-green-600" />
      <h1 className="text-3xl font-semibold tracking-tight">Thank you!</h1>
      <p className="text-muted-foreground">
        {valid ? (
          <>
            Your order <span className="font-semibold text-foreground">#{number}</span> has been received.
          </>
        ) : (
          "Your order has been received."
        )}{" "}
        We&apos;ll call you shortly to confirm it. Please have the cash ready when it arrives.
      </p>
      <Link href="/products" className={cn(buttonVariants({ size: "lg" }))}>
        Continue shopping
      </Link>
    </div>
  );
}
