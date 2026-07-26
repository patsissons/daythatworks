import { User } from 'lucide-react'
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
  return (
    <span
      title={name || 'Hidden'}
      className={cn(
        'bg-secondary text-secondary-foreground grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-medium',
        className,
      )}
    >
      {name ? (
        initials(name)
      ) : (
        <User className="size-3.5" aria-label="Hidden" />
      )}
    </span>
  )
}
