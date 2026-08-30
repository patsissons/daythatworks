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
import { resolveAvatarSrc } from '@/lib/avatar'
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

interface AvatarFaceProps {
  /** Empty when the member's name is hidden. */
  name: string
  /** Provider avatar image; falls back to initials when absent or broken. */
  avatarUrl?: string
}

/** The face inside an avatar chip: provider image, initials, or a person icon. */
export function AvatarFace({ name, avatarUrl }: AvatarFaceProps) {
  const [failedUrl, setFailedUrl] = useState<string>()
  if (avatarUrl && avatarUrl !== failedUrl) {
    return (
      <img
        src={resolveAvatarSrc(avatarUrl)}
        alt=""
        referrerPolicy="no-referrer"
        className="size-full rounded-full object-cover"
        onError={() => setFailedUrl(avatarUrl)}
      />
    )
  }
  return name ? (
    <>{initials(name)}</>
  ) : (
    <User className="size-3.5" aria-hidden />
  )
}

interface InitialsAvatarProps extends AvatarFaceProps {
  className?: string
}

export function InitialsAvatar({
  name,
  avatarUrl,
  className,
}: InitialsAvatarProps) {
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
            'bg-secondary text-secondary-foreground grid size-6 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border text-[10px] font-medium transition-shadow',
            'hover:ring-ring/50 focus-visible:ring-ring/50 hover:ring-2 focus-visible:ring-2 focus-visible:outline-none',
            className,
          )}
        >
          <AvatarFace name={name} avatarUrl={avatarUrl} />
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
