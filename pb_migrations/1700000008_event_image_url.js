/// <reference path="../pb_data/types.d.ts" />

// events.imageUrl: optional external image link, an alternative to the
// uploaded `image` file. Consumers (EventPage, og.js) prefer imageUrl when
// both exist. The http(s) pattern also blocks javascript:/data: schemes.
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.fields.add(
      new TextField({
        name: 'imageUrl',
        max: 2048,
        pattern: '^https?://\\S+$',
      }),
    )
    app.save(events)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.fields.removeByName('imageUrl')
    app.save(events)
  },
)
