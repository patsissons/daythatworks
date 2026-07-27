import { useState } from 'react'
import { User } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface InitialsAvatarProps {
  /** Empty when the member's name is hidden. */
  name: string
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function InitialsAvatar({ name, className }: InitialsAvatarProps) {
  // hover/focus-driven like a tooltip; tap still toggles it on touch devices
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={name || 'Name hidden'}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={cn(
            'bg-secondary text-secondary-foreground grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border text-[10px] font-medium transition-shadow',
            'hover:ring-ring/50 focus-visible:ring-ring/50 hover:ring-2 focus-visible:ring-2 focus-visible:outline-none',
            className,
          )}
        >
          {name ? initials(name) : <User className="size-3.5" aria-hidden />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="pointer-events-none w-auto px-3 py-1.5 text-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {name || 'Name hidden'}
      </PopoverContent>
    </Popover>
  )
}
