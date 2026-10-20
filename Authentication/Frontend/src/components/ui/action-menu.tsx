'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ActionMenuItem = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  label?: string;
  align?: 'start' | 'end' | 'center';
  triggerClassName?: string;
  contentClassName?: string;
};

export function ActionMenu({
  items,
  label = 'Actions',
  align = 'end',
  triggerClassName,
  contentClassName,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-navy transition hover:border-primary hover:bg-primary/10',
          triggerClassName
        )}
        aria-label={label}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn('min-w-[11rem] border-border bg-white text-navy shadow-lg', contentClassName)}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted">
            {label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={item.disabled}
                variant={item.destructive ? 'destructive' : 'default'}
                onClick={() => {
                  if (item.disabled) return;
                  if (item.href) {
                    window.location.href = item.href;
                    return;
                  }
                  item.onClick?.();
                }}
                className="cursor-pointer"
              >
                {item.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
