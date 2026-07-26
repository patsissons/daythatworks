/// <reference path="../pb_data/types.d.ts" />

// Dev-only fake OAuth: POST /api/dev-login authenticates as the user named by
// DEV_AUTH_NAME/DEV_AUTH_EMAIL, creating it on first use. The route only
// exists when DEV_AUTH=true — set it on a LOCAL `pocketbase serve` only,
// never in PocketHost secrets.
if ($os.getenv('DEV_AUTH') === 'true') {
  routerAdd('POST', '/api/dev-login', (e) => {
    const email = $os.getenv('DEV_AUTH_EMAIL') || 'dev@example.com'
    const name = $os.getenv('DEV_AUTH_NAME') || 'Dev User'

    let user
    try {
      user = e.app.findAuthRecordByEmail('users', email)
    } catch (err) {
      const users = e.app.findCollectionByNameOrId('users')
      user = new Record(users)
      user.set('email', email)
      user.set('name', name)
      user.setVerified(true)
      user.setRandomPassword()
      e.app.save(user)
    }

    return $apis.recordAuthResponse(e, user, 'dev')
  })
  console.log('[dev-auth] /api/dev-login enabled')
}
