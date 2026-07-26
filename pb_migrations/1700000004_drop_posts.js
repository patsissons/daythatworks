/// <reference path="../pb_data/types.d.ts" />

// The scaffold's demo posts collection is no longer used by the app.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('posts')
    app.delete(collection)
  },
  (app) => {
    const collection = new Collection({
      type: 'base',
      name: 'posts',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text', name: 'title', required: true, max: 200 },
        { type: 'text', name: 'body', max: 10000 },
        { type: 'autodate', name: 'created', onCreate: true },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
)
