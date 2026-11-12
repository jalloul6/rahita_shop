import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && <p className="text-xs font-semibold tracking-[0.2em] text-highlight uppercase">{eyebrow}</p>}
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
