import { pb } from '@/lib/pocketbase'

/**
 * Resolve a stored avatar value to an <img> src. Relative values
 * (`/api/files/...` from the users avatar file field) must resolve against
 * the PocketBase origin — in dev the SPA runs on Vite's origin, not PB's.
 */
export function resolveAvatarSrc(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/')) return new URL(url, pb.baseURL).toString()
  return url
}
