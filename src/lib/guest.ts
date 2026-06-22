const GUEST_COOKIE = 'lila_guest_id'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export function getGuestId(): string {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`))
  if (match) return match[1]
  const id = crypto.randomUUID()
  document.cookie = `${GUEST_COOKIE}=${id}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
  return id
}

export function readExistingGuestId(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`))
  return match ? match[1] : null
}

export function clearGuestId(): void {
  document.cookie = `${GUEST_COOKIE}=; path=/; max-age=0`
}
