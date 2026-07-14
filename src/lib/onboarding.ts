const HINT_DISMISSED_KEY = 'lekh:onboarding-hint-dismissed'

export function hasHintBeenDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function markHintDismissed(): void {
  try {
    localStorage.setItem(HINT_DISMISSED_KEY, '1')
  } catch {
    // localStorage unavailable — the dismissal just won't be remembered
  }
}
