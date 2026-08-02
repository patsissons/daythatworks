/// <reference path="../pb_data/types.d.ts" />

// Headless first-admin bootstrap: if INITIAL_ADMIN_EMAIL and
// INITIAL_ADMIN_PASSWORD are set (PocketHost dashboard → Secrets) and no
// matching superuser exists, one is created at startup. With PocketHost's
// Admin Sync (on by default) your pockethost.io login already works, so this
// is only needed for fully headless setups.
//
// In local dev (DEV_AUTH=true, never set on PocketHost) a default superuser
// is created even without the env vars — otherwise `pocketbase serve` on a
// fresh pb_data has no superuser and auto-opens the /_/#/pbinstall installer
// page in the browser on every boot.
onBootstrap((e) => {
  e.next()

  let email = $os.getenv('INITIAL_ADMIN_EMAIL')
  let password = $os.getenv('INITIAL_ADMIN_PASSWORD')
  if ((!email || !password) && $os.getenv('DEV_AUTH') === 'true') {
    email = 'admin@local.test'
    password = 'localdev-admin'
  }
  if (!email || !password) return

  try {
    e.app.findAuthRecordByEmail('_superusers', email)
    return // already exists
  } catch (err) {
    // not found — create below
  }

  const superusers = e.app.findCollectionByNameOrId('_superusers')
  const record = new Record(superusers)
  record.set('email', email)
  record.set('password', password)
  e.app.save(record)
  console.log('[admin] bootstrapped superuser ' + email)
})
