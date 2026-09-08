import { Capacitor, registerPlugin } from '@capacitor/core'

interface CalendarIntentPlugin {
  addEvent(options: { title: string; date: string }): Promise<void>
}

const CalendarIntent = registerPlugin<CalendarIntentPlugin>('CalendarIntent')

/* Local calendar fields, never toISOString — Nepal is UTC+05:45, so reading a
 * local-midnight Date back as UTC names the day before. Same trap as
 * CalendarPage.icsDate, which is why both build the string by hand. */
export function localIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Hand a festival to the calendar app's own new-event screen.
 *
 * Returns false when that route does not exist here, which is the caller's cue
 * to fall back to writing a .ics — and there are three separate ways it can
 * not exist:
 *
 * - the web, where there is no intent to fire;
 * - an APK older than CalendarIntentPlugin, since server.url runs this web
 *   code against whatever shell is installed (the same reason print.ts checks
 *   isPluginAvailable rather than just isNativePlatform);
 * - a phone with no calendar app, which the plugin reports by rejecting.
 */
export async function openCalendarEvent(title: string, date: Date): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('CalendarIntent')) {
      return false
    }
    await CalendarIntent.addEvent({ title, date: localIsoDate(date) })
    return true
  } catch {
    return false
  }
}
