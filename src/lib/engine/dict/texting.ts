// How people actually spell common words when texting — the long-vowel and
// v-for-bh habits the pattern reads literally. tapaailai is तपाईंलाई, not
// तपाइलै; vayo is भयो, not वयो. Kept in a file of its own (2026-10-08) so the
// owner can review the additions in one place; none of these keys shadows an
// existing entry (engine.test.ts checks every dictionary key round-trips).
export const TEXTING: Record<string, string> = {
  // you / to you — the doubled-a spelling of the pronoun
  tapaai: 'तपाईं',
  tapaailai: 'तपाईंलाई',
  tapaaiko: 'तपाईंको',
  tapaaile: 'तपाईंले',
  hajurlai: 'हजुरलाई',
  laai: 'लाई',
  // thanks, fine, okay
  dhanyabaad: 'धन्यवाद',
  thik: 'ठिक',
  theek: 'ठिक',
  thikai: 'ठिकै',
  kei: 'केही',
  kosto: 'कस्तो',
  raamro: 'राम्रो',
  mayalu: 'मायालु',
  thakai: 'थकाइ',
  // v for bh, and the short forms of भएको
  vayo: 'भयो',
  bhako: 'भएको',
  vako: 'भएको',
  // come, go, do — the imperative and "let's" forms
  gara: 'गर',
  aau: 'आऊ',
  aaunus: 'आउनुस्',
  jaau: 'जाऊ',
  jaun: 'जाऔं',
  // people
  bua: 'बुवा',
  baba: 'बाबा',
  kancha: 'कान्छा',
  kanchi: 'कान्छी',
  // things, places, days
  tika: 'टीका',
  teeka: 'टीका',
  chhath: 'छठ',
  chhat: 'छठ',
  thamel: 'ठमेल',
  saman: 'सामान',
  dokan: 'दोकान',
  paila: 'पहिला',
}
