import { useEffect } from 'react'

const BASE_TITLE = 'Day that works — find a day that works'

/** Set the document title for this page, restoring the default on unmount. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — Day that works` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
