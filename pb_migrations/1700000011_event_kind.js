/// <reference path="../pb_data/types.d.ts" />

// events.kind: what the candidate options are. 'dates' (or empty, for rows
// created before this field existed) polls specific YYYY-MM-DD days;
// 'weekdays' polls recurring days of the week, stored in the same `dates`
// json field as 'sun'…'sat' tokens. Immutable after creation (records.pb.js).
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.fields.add(
      new SelectField({
        name: 'kind',
        maxSelect: 1,
        values: ['dates', 'weekdays'],
      }),
    )
    app.save(events)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.fields.removeByName('kind')
    app.save(events)
  },
)
