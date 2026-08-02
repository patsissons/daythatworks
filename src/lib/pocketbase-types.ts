// Minimal record types for the scaffolded schema.
// Regenerate from the live schema with the `typegen` script after changing
// pb_migrations/ (see README.md).

export interface EventsRecord {
  id: string
  title: string
  slug: string
  description: string
  image: string
  dates: string[]
  hideNames: boolean
  creator: string
  creatorName: string
  creatorEmail: string
  created: string
  updated: string
}

export interface SubmissionsRecord {
  id: string
  event: string
  submitter: string
  submitterName: string
  submitterEmail: string
  dates: string[]
  created: string
  updated: string
  expand?: {
    event?: EventsRecord
  }
}

export interface UsersRecord {
  id: string
  email: string
  name: string
  avatar: string
  guest?: boolean
  created: string
  updated: string
}
