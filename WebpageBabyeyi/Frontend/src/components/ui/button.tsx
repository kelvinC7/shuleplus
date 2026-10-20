import { cva, type VariantProps } from 'class-variance-authority';
import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium text-[14.5px] whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-amber-500 text-[#402A00] hover:bg-amber-400 hover:-translate-y-px hover:shadow-md',
        outline:
          'bg-white text-sky-700 border-[1.5px] border-sky-200 hover:border-sky-500 hover:bg-sky-50',
        inverse: 'bg-sky-700 text-white hover:bg-sky-900',
        ghostDark:
          'bg-white/15 text-white border-[1.5px] border-white/35 hover:bg-white/25',
      },
      size: {
        default: 'px-[22px] py-3',
        sm: 'px-4 py-[9px] text-[13px]',
        block: 'w-full py-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  asChild,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ className?: string }>, {
      className: cn(classes, (children as ReactElement<{ className?: string }>).props.className),
    });
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export { buttonVariants };
