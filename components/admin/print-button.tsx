"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminT } from "@/lib/i18n/admin-client";

export function PrintButton() {
  const { t } = useAdminT();
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="size-4" />
      {t.common.print}
    </Button>
  );
}
