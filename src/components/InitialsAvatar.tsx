import {
  createContext,
  useContext,
  useId,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { User } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { initials } from '@/lib/initials'
import { cn } from '@/lib/utils'

// Coordinates a group of avatars so at most one name popover is open:
// hovering (or tapping) a chip replaces any other open popover instantly.
const AvatarPopoverContext = createContext<{
  openId: string | null
  setOpenId: Dispatch<SetStateAction<string | null>>
} | null>(null)

export function AvatarPopoverGroup({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <AvatarPopoverContext.Provider value={{ openId, setOpenId }}>
      {children}
    </AvatarPopoverContext.Provider>
  )
}

interface InitialsAvatarProps {
  /** Empty when the member's name is hidden. */
  name: string
  className?: string
}

export function InitialsAvatar({ name, className }: InitialsAvatarProps) {
  const id = useId()
  const group = useContext(AvatarPopoverContext)
  const [localOpen, setLocalOpen] = useState(false)

  const open = group ? group.openId === id : localOpen

  function setOpen(next: boolean) {
    if (group) {
      // closing only clears our own popover; opening takes over the group
      group.setOpenId((current) =>
        next ? id : current === id ? null : current,
      )
    } else {
      setLocalOpen(next)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={name || 'Name hidden'}
          // hover for mice; touch relies on the trigger's tap-to-toggle
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') setOpen(true)
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') setOpen(false)
          }}
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
        className="pointer-events-none w-auto px-3 py-1.5 text-sm data-[state=closed]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {name || 'Name hidden'}
      </PopoverContent>
    </Popover>
  )
}
