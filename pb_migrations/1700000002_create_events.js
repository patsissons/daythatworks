/// <reference path="../pb_data/types.d.ts" />

// Events: a titled set of candidate dates shared via permalink. Ids are
// 26-char lowercased ULIDs supplied by the client (the id field below relaxes
// the default 15-char constraint); slug is an optional vanity permalink,
// unique only among non-empty values (partial index).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const collection = new Collection({
      type: 'base',
      name: 'events',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: 'creator = @request.auth.id',
      deleteRule: 'creator = @request.auth.id',
      fields: [
        {
          type: 'text',
          name: 'id',
          primaryKey: true,
          required: true,
          system: true,
          min: 26,
          max: 26,
          pattern: '^[a-z0-9]+$',
          autogeneratePattern: '[a-z0-9]{26}',
        },
        { type: 'text', name: 'title', required: true, max: 200 },
        { type: 'text', name: 'slug', max: 100, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        { type: 'text', name: 'description', max: 5000 },
        {
          type: 'file',
          name: 'image',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        { type: 'json', name: 'dates', maxSize: 20000 },
        { type: 'bool', name: 'hideNames' },
        {
          type: 'relation',
          name: 'creator',
          collectionId: users.id,
          maxSelect: 1,
          required: true,
        },
        { type: 'text', name: 'creatorName', max: 200 },
        { type: 'text', name: 'creatorEmail', max: 200 },
        { type: 'autodate', name: 'created', onCreate: true },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_events_slug ON events (slug) WHERE slug != ''",
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('events')
    app.delete(collection)
  },
)
