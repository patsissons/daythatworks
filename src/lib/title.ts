import { useEffect } from 'react'

// Keep in sync with the <title> inside index.html's og marker block.
const BASE_TITLE = 'Day that works — free group scheduling poll'

/** Set the document title for this page, restoring the default on unmount. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — Day that works` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
