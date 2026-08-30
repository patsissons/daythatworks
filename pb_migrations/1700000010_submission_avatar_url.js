/// <reference path="../pb_data/types.d.ts" />

// submissions.submitterAvatarUrl: denormalized copy of the submitter's
// effective avatar (provider URL or relative /api/files/... path), stamped
// server-side like submitterName since clients cannot read other users'
// records. Client-sent values are always overwritten by the request hooks.
migrate(
  (app) => {
    const submissions = app.findCollectionByNameOrId('submissions')
    submissions.fields.add(
      new TextField({
        name: 'submitterAvatarUrl',
        max: 2048,
        pattern: '^(https?://|/api/files/)\\S+$',
      }),
    )
    app.save(submissions)
  },
  (app) => {
    const submissions = app.findCollectionByNameOrId('submissions')
    submissions.fields.removeByName('submitterAvatarUrl')
    app.save(submissions)
  },
)
