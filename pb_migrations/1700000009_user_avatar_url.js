/// <reference path="../pb_data/types.d.ts" />

// users.avatarUrl: identity-provider avatar image URL, captured at OAuth
// login (or backfilled from a linked GitHub account). The uploaded `avatar`
// file (populated by the stock oauth2 mappedFields at account creation) is
// the fallback when this is empty. The http(s) pattern also blocks
// javascript:/data: schemes.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new TextField({
        name: 'avatarUrl',
        max: 2048,
        pattern: '^https?://\\S+$',
      }),
    )
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('avatarUrl')
    app.save(users)
  },
)
