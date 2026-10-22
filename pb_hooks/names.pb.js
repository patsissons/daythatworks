/// <reference path="../pb_data/types.d.ts" />

// A user's name is denormalized onto their submissions (submitterName) and
// events (creatorName). When it changes — e.g. a guest renames or clears it
// from the respond/new-event forms — re-stamp it everywhere so every event
// shows the current name, not just the record saved alongside the rename.
onRecordAfterUpdateSuccess((e) => {
  e.next()
  const lib = require(`${__hooks}/lib/names.js`)
  try {
    lib.syncUserName(e.app, e.record)
  } catch (err) {
    console.error('[names] failed to sync user name', err)
  }
}, 'users')
