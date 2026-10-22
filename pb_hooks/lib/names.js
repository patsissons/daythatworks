// Keeps the denormalized submitterName/creatorName fields in step with the
// user's current name (guests can rename or clear theirs). Loaded with
// require() from inside handler callbacks (JSVM handlers cannot close over
// top-level file scope).

const TARGETS = [
  { collection: 'submissions', owner: 'submitter', field: 'submitterName' },
  { collection: 'events', owner: 'creator', field: 'creatorName' },
]

/** Re-stamp the user's name on every submission and event they own. */
function syncUserName(app, user) {
  const name = user.getString('name')
  for (let t = 0; t < TARGETS.length; t++) {
    const target = TARGETS[t]
    // the != filter makes this a cheap no-op when nothing is stale
    const stale = app.findRecordsByFilter(
      target.collection,
      target.owner + ' = {:user} && ' + target.field + ' != {:name}',
      '',
      0,
      0,
      { user: user.id, name: name },
    )
    for (let i = 0; i < stale.length; i++) {
      stale[i].set(target.field, name)
      app.save(stale[i])
    }
  }
}

module.exports = {
  syncUserName,
}
