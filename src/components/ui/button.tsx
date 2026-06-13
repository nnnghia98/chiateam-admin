import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-airbnb text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-page active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#222222] text-white hover:bg-design-primary dark:bg-[#222222] dark:hover:bg-design-primary-hover',
        destructive:
          'bg-design-error text-white hover:bg-design-primary-hover',
        outline:
          'border border-design-border bg-design-card text-design-text hover:border-design-text hover:shadow-design-hover',
        secondary:
          'bg-design-muted text-design-text hover:brightness-95 dark:hover:brightness-110',
        ghost:
          'text-design-secondary hover:bg-design-muted hover:text-design-text',
        link:
          'text-design-primary underline-offset-4 hover:text-design-primary-hover hover:underline',
      },
      size: {
        default: 'h-10 px-6 py-2',
        sm: 'h-9 px-4',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
