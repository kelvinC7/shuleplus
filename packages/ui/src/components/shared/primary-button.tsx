import type { ComponentProps } from 'react';
import { Button } from '../../primitives/button';
import { cn } from '../../lib/utils';

export function PrimaryButton({ className, children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn('font-semibold shadow-sm hover:shadow-md', className)}
      {...props}
    >
      {children}
    </Button>
  );
}
