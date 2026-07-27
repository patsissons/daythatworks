/// <reference path="../pb_data/types.d.ts" />

// Guest participation: users get a `guest` flag (set by /api/guest-login in
// pb_hooks/guest-auth.pb.js), auth tokens last 180 days so returning guests
// can still edit their responses, and event creation is restricted to full
// (non-guest) accounts.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new BoolField({ name: 'guest' }))
    users.authToken.duration = 15552000 // 180 days
    app.save(users)

    const events = app.findCollectionByNameOrId('events')
    events.createRule = "@request.auth.id != '' && @request.auth.guest != true"
    app.save(events)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.createRule = "@request.auth.id != ''"
    app.save(events)

    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('guest')
    users.authToken.duration = 1209600
    app.save(users)
  },
)
