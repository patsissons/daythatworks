import { useEffect } from 'react'

const BASE_TITLE = 'daythatworks — find a day that works'

/** Set the document title for this page, restoring the default on unmount. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — daythatworks` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
