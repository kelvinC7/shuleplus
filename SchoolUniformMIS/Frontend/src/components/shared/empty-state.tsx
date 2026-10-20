import * as React from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * EmptyState - shown when a list/table/search has no results.
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-6">
        {icon ?? <Inbox />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
