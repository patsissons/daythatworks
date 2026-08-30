// Shared helpers for sourcing user avatar images. Loaded with require() from
// inside handler callbacks (JSVM handlers cannot close over top-level file
// scope).

const PROVIDER_URL_PATTERN = /^https?:\/\/\S+$/

/**
 * The user's effective avatar: the captured provider URL, else the `avatar`
 * file downloaded by the stock oauth2 mappedFields at account creation
 * (served as a relative path — the file field is not protected), else ''.
 */
function resolveAvatarUrl(user) {
  const url = user.getString('avatarUrl')
  if (url) return url
  const file = user.getString('avatar')
  if (file) return '/api/files/users/' + user.id + '/' + file
  return ''
}

/** Persist a changed provider avatar URL; returns true when saved. */
function syncUserAvatar(app, user, providerUrl) {
  if (!providerUrl || !PROVIDER_URL_PATTERN.test(providerUrl)) return false
  if (providerUrl === user.getString('avatarUrl')) return false
  user.set('avatarUrl', providerUrl)
  app.save(user)
  return true
}

/**
 * GitHub avatar URLs are deterministic from the account id, so a linked
 * GitHub login can recover an avatar without re-authenticating. Other
 * providers (Google) have no equivalent; their URL is captured at login.
 */
function githubFallbackUrl(app, user) {
  if (user.getBool('guest')) return ''
  const auths = app.findAllExternalAuthsByRecord(user)
  for (let i = 0; i < auths.length; i++) {
    if (auths[i].getString('provider') === 'github') {
      return 'https://avatars.githubusercontent.com/u/' + auths[i].getString('providerId')
    }
  }
  return ''
}

/** Refresh the denormalized submitterAvatarUrl on the user's submissions. */
function backfillSubmissions(app, user) {
  const resolved = resolveAvatarUrl(user)
  const stale = app.findRecordsByFilter(
    'submissions',
    'submitter = {:user} && submitterAvatarUrl != {:avatar}',
    '',
    0,
    0,
    { user: user.id, avatar: resolved },
  )
  for (let i = 0; i < stale.length; i++) {
    stale[i].set('submitterAvatarUrl', resolved)
    app.save(stale[i])
  }
}

module.exports = {
  resolveAvatarUrl,
  syncUserAvatar,
  githubFallbackUrl,
  backfillSubmissions,
}
