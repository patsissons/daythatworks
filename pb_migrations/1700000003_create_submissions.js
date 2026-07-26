/// <reference path="../pb_data/types.d.ts" />

// Submissions: one per user per event (unique index), recording which of the
// event's candidate dates work for that member. `dates` is intentionally not
// required — an empty array is a valid "none of these work" response. Same
// client-supplied ULID id scheme as events.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const events = app.findCollectionByNameOrId('events')
    const collection = new Collection({
      type: 'base',
      name: 'submissions',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: 'submitter = @request.auth.id',
      deleteRule: 'submitter = @request.auth.id',
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
        {
          type: 'relation',
          name: 'event',
          collectionId: events.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          type: 'relation',
          name: 'submitter',
          collectionId: users.id,
          maxSelect: 1,
          required: true,
        },
        { type: 'text', name: 'submitterName', max: 200 },
        { type: 'text', name: 'submitterEmail', max: 200 },
        { type: 'json', name: 'dates', maxSize: 20000 },
        { type: 'autodate', name: 'created', onCreate: true },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_submissions_event_submitter ON submissions (event, submitter)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('submissions')
    app.delete(collection)
  },
)
