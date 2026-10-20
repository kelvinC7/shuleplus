import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 pl-9 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className
        )}
        {...props}
      />
    </div>
  );
}
