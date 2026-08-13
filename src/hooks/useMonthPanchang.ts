import { useEffect, useMemo, useState } from 'react'
import {
  buildMonth,
  fetchLiveMonth,
  getBundledMonth,
  type MonthPanchang,
  type RawMonth,
} from '../lib/calendar/panchang'

export type PanchangSource = 'bundled' | 'live' | 'none'

export interface MonthPanchangState {
  month: MonthPanchang | null
  source: PanchangSource
  /** True only while there is nothing to show yet — see the note below. */
  loading: boolean
}

/* Bundled first, live on top.
 *
 * The bundled table is read during render, so the calendar is never blank and
 * never waits on the network. A live fetch then runs for the same month and
 * supersedes it if it succeeds — that is what makes a holiday added or removed
 * by cabinet decision appear within a day, and what lets years beyond the
 * bundled range work at all.
 *
 * Only the fetch result is state, and it is only ever set from inside the
 * promise. Nothing is set synchronously in the effect body: that schedules a
 * second render pass for something that is really just derived data, and the
 * lint rule that forbids it is right.
 *
 * The result carries the month it belongs to. Without that key, paging quickly
 * from Shrawan to Bhadra and back could let a slow response for one month land
 * as the answer for another — the classic stale-response race, and one that
 * would look like the calendar showing the wrong festivals rather than like a
 * bug in a fetch.
 *
 * `loading` is deliberately true only when there is nothing to show. Flagging
 * the refresh that sits behind already-correct data would put a spinner on
 * screen every time you page a month, for a change that almost never comes.
 *
 * There is no cache or retry here on purpose: the service worker gives the
 * upstream URL a StaleWhileRevalidate route, so a second view is served from
 * cache instantly and refreshed in the background, and a month fetched once
 * keeps working offline.
 */
export function useMonthPanchang(year: number, month: number): MonthPanchangState {
  const key = `${year}-${month}`
  const [settled, setSettled] = useState<{ key: string; raw: RawMonth | null } | null>(null)

  useEffect(() => {
    let alive = true
    void fetchLiveMonth(year, month).then((raw) => {
      if (alive) setSettled({ key: `${year}-${month}`, raw })
    })
    return () => {
      alive = false
    }
  }, [year, month])

  return useMemo(() => {
    const bundled = getBundledMonth(year, month)
    const forThisMonth = settled?.key === key ? settled : null
    const live = forThisMonth?.raw ?? null
    const chosen = live ?? bundled
    return {
      month: chosen ? buildMonth(chosen) : null,
      source: live ? 'live' : bundled ? 'bundled' : 'none',
      // Nothing to show, and the fetch has not come back yet.
      loading: !chosen && !forThisMonth,
    }
  }, [year, month, key, settled])
}
