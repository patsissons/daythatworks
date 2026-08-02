/// <reference path="../pb_data/types.d.ts" />

// Guest event creation: guests may now create events (rate limited by the
// hooks in pb_hooks/records.pb.js), so the createRule only requires auth.
// guest_event_log is a superuser-only ledger of guest creations (salted IP
// hash + creator id) used for the sliding-window rate limits; `creator` is a
// plain text field on purpose so rows survive guest-user deletion.
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.createRule = "@request.auth.id != ''"
    app.save(events)

    const collection = new Collection({
      type: 'base',
      name: 'guest_event_log',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: 'text',
          name: 'id',
          primaryKey: true,
          required: true,
          system: true,
          min: 15,
          max: 15,
          pattern: '^[a-z0-9]+$',
          autogeneratePattern: '[a-z0-9]{15}',
        },
        { type: 'text', name: 'ipHash', required: true, max: 64 },
        { type: 'text', name: 'creator', required: true, max: 64 },
        { type: 'autodate', name: 'created', onCreate: true },
      ],
      indexes: [
        'CREATE INDEX idx_guest_event_log_ip ON guest_event_log (ipHash, created)',
        'CREATE INDEX idx_guest_event_log_creator ON guest_event_log (creator, created)',
        'CREATE INDEX idx_guest_event_log_created ON guest_event_log (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('guest_event_log')
    app.delete(collection)

    const events = app.findCollectionByNameOrId('events')
    events.createRule = "@request.auth.id != '' && @request.auth.guest != true"
    app.save(events)
  },
)
