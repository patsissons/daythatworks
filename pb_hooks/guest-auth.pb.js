/// <reference path="../pb_data/types.d.ts" />

// Guest sign-in: POST /api/guest-login {name} creates a real auth user
// flagged guest=true (synthetic email, random password) and returns a normal
// auth response. The SPA stores the token like any login, which is what lets
// guests edit their responses later and keeps their name across events.
// Guests cannot create events (see events createRule) — only respond.
routerAdd('POST', '/api/guest-login', (e) => {
  const body = e.requestInfo().body
  const name = String((body && body.name) || '').trim()
  if (name.length < 1 || name.length > 100) {
    throw new BadRequestError('Enter your name (1-100 characters).')
  }

  const users = e.app.findCollectionByNameOrId('users')
  const user = new Record(users)
  user.set('name', name)
  user.set('guest', true)
  user.set(
    'email',
    'guest-' +
      $security.randomStringWithAlphabet(16, 'abcdefghijklmnopqrstuvwxyz0123456789') +
      '@guest.daythatworks.com',
  )
  user.setRandomPassword()
  e.app.save(user)

  return $apis.recordAuthResponse(e, user, 'guest')
})
