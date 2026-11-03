/* SPELLING
 *
 * The upstream almanac is typed by hand, and it shows: the same festival is
 * spelled two or three ways across years (रवि सप्तमी, रविसप्तमी, रवी सप्तमी),
 * there are plain typos (वसन्तपञ्यमी, बाला चतुदर्शी, द्दितीया), Newar names
 * carry an ASCII colon where the visarga ः belongs, and "holiday" is written
 * विदा ("farewell") as often as बिदा. The owner asked for the names to match
 * the spellings in common use (2026-11-03).
 *
 * This runs on every name Lekh takes from upstream, in both places it is
 * read: the generator that bakes src/data/calendar/panchang.json (and from it
 * the widget's copy and the /calendar/v1 feed), and the browser's live
 * refresh (panchang.ts). It runs after CORRECTIONS (upstream.ts), whose `was`
 * matches upstream's own text.
 *
 * Only fixes with a clear right answer are here: typos, inconsistent spacing
 * of one name, and the standard form where Nepali sources agree (checked
 * 2026-11-03 against Onlinekhabar, Ekantipur, Gorkhapatra and the Heidelberg
 * DANAM temple records for the less common ones: धनतेरस, धन्वन्तरि,
 * वरुथिनी, बलम्बु, सोनाम ल्होसार). Newar names written several valid ways
 * (ल्हुति पुन्हिः / ल्हुतिपुन्हीः) are left as upstream has them, apart from
 * the colon. */

/** The almanac's tithi spellings that are wrong, and the right ones. */
const TITHI: Record<string, string> = {
  'द्दितीया': 'द्वितीया',
  'पुर्णिमा': 'पूर्णिमा',
  'औशी': 'औंसी',
}

export function fixTithi(tithi: string): string {
  const t = tithi.trim()
  return TITHI[t] ?? t
}

/* Exact substrings, applied in order; a longer phrase goes before any
   shorter one it contains. */
const PHRASES: [string, string][] = [
  ['आद्यगुरू शंखराचार्य', 'आद्यगुरु शङ्कराचार्य'],
  ['आद्यगुरू शङ्कराचार्य', 'आद्यगुरु शङ्कराचार्य'],
  ['गुरूनानक', 'गुरु नानक'],
  ['गुरू ', 'गुरु '],
  ['समाप्ती', 'समाप्ति'],
  ['ईन्द्र', 'इन्द्र'],
  ['उत्पतिका', 'उत्पत्तिका'],
  ['कागतिहार', 'काग तिहार'],
  ['किजापूजा', 'किजा पूजा'],
  ['गुँला धर्म', 'गुँलाधर्म'],
  ['गुलांँधर्म', 'गुँलाधर्म'],
  ['गोरखाकाली', 'गोरखकाली'],
  ['गोश्वामी', 'गोस्वामी'],
  ['गोसाइँकुण्डस्नान', 'गोसाइँकुण्ड स्नान'],
  ['स्नानसमाप्ति', 'स्नान समाप्ति'],
  ['गौरापर्व', 'गौरा पर्व'],
  [')काय अष्टमी', '), काय अष्टमी'],
  ['चैतेदशैं', 'चैते दशैं'],
  ['छठपर्व', 'छठ पर्व'],
  ['जितियापर्व', 'जितिया पर्व'],
  ['उधौलीपर्व', 'उधौली पर्व'],
  ['तराइमा', 'तराईमा'],
  ['तुलसी को दल', 'तुलसीको दल'],
  ['तृतीय श्राद्ध', 'तृतीया श्राद्ध'],
  ['द्वितीय श्राद्ध', 'द्वितीया श्राद्ध'],
  ['दर्शश्राद्ध', 'दर्श श्राद्ध'],
  ['सोह्रश्राद्ध', 'सोह्र श्राद्ध'],
  ['ल्होछार', 'ल्होसार'],
  ['तमुल्होसार', 'तमु ल्होसार'],
  ['दर्शैको टीका', 'दशैंको टीका'],
  ['दशैको टिका', 'दशैंको टीका'],
  ['दहिचिउरा', 'दही चिउरा'],
  ['धन्तेरस', 'धनतेरस'],
  ['धन्वन्तरी', 'धन्वन्तरि'],
  ['नागपञ्चमी', 'नाग पञ्चमी'],
  ['पापमोचनी', 'पापमोचिनी'],
  ['पापाङकुशा', 'पापाङ्कुशा'],
  ['पुर्णिमा', 'पूर्णिमा'],
  ['जनैपूर्णिमा', 'जनै पूर्णिमा'],
  ['बरूथिनी', 'वरुथिनी'],
  ['बलम्वु', 'बलम्बु'],
  ['चतुदर्शी', 'चतुर्दशी'],
  ['बैष्णव', 'वैष्णव'],
  ['ब्रम्हायणी', 'ब्रह्मायणी'],
  ['भ.पु. ', 'भक्तपुर '],
  ['ल.पु. ', 'ललितपुर '],
  ['भिष्माष्टमी', 'भीष्माष्टमी'],
  ['भुकम्प', 'भूकम्प'],
  ['मंगलचौथी', 'मङ्गल चौथी'],
  ['मंगल चौथी', 'मङ्गल चौथी'],
  ['मङ्गलचौथी', 'मङ्गल चौथी'],
  ['मत्स्येजयन्ती', 'मत्स्य जयन्ती'],
  ['मत्स्येनारायण', 'मत्स्यनारायण'],
  ['(ज्याःपुन्हिः) कवीर जयन्ती', '(ज्याःपुन्हिः), कबीर जयन्ती'],
  ['महा नवमी', 'महानवमी'],
  ['महाष्टमी', 'महाअष्टमी'],
  ['महाशिवरात्री', 'महाशिवरात्रि'],
  ['वेचविखन', 'बेचबिखन'],
  ['विरूद्धको', 'विरुद्धको'],
  ['यमदीपदान', 'यमदीप दान'],
  ['रविसप्तमी', 'रवि सप्तमी'],
  ['रवी सप्तमी', 'रवि सप्तमी'],
  ['राम नवमी', 'रामनवमी'],
  ['रोपाईं जात्रा', 'रोपाइँ जात्रा'],
  ['वसन्तश्रवण श्रीपञ्यमी', 'वसन्त श्रवण श्रीपञ्चमी'],
  ['वसन्तपञ्यमी', 'वसन्त पञ्चमी'],
  ['सुरू', 'सुरु'],
  ['संक्रान्ती', 'संक्रान्ति'],
  ['सिथिःचःह्रे', 'सिथिः चःह्रे'],
  ['सिथिचःह्रे', 'सिथिः चःह्रे'],
  ['सिथिःनखः', 'सिथि नखः'],
  ['सिथीःनख', 'सिथि नखः'],
  ['सिथीः नख', 'सिथि नखः'],
  ['सिरूवा', 'सिरुवा'],
  ['स्वाँया पून्हिः', 'स्वाँया पुन्हिः'],
  ['शशीधर', 'शशिधर'],
  ['हरिपरिवर्तनी', 'हरिपरिवर्तिनी'],
  ['हरिबोधनी', 'हरिबोधिनी'],
  ['शहिद दिवस', 'सहिद दिवस'],
  ['षटतिला', 'षट्तिला'],
  ['घोडेजात्रा', 'घोडे जात्रा'],
  ['गठाँमुगचह्नेः', 'गठाँमुग चःह्रे'],
  ['गथामुग चःह्रेः', 'गठाँमुग चःह्रे'],
  ['दरखाने दिन', 'दर खाने दिन'],
  ['कानून', 'कानुन'],
  ['खिर खाने', 'खीर खाने'],
  ['त्रिशुल', 'त्रिशूल'],
  ['औँसी', 'औंसी'],
  ['गुहेश्वरी', 'गुह्येश्वरी'],
  ['बराह जयन्ती', 'वराह जयन्ती'],
  ['विजया दशमी', 'विजयादशमी'],
  ['कल्की', 'कल्कि'],
]

const DEVANAGARI = '\\u0900-\\u097F'

/** One day's festival text from upstream, spelled the way it is in common use. */
export function fixFestivalText(text: string): string {
  let s = text
    // Zero-width joiners and non-joiners inside a word change nothing a
    // reader sees but make two spellings of one name compare unequal.
    .replace(/[‌‍]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // An ASCII colon after a Devanagari letter is a visarga typed on a Latin
  // keyboard: "चःह्रे:" → "चःह्रेः".
  s = s.replace(new RegExp(`([${DEVANAGARI}]):`, 'g'), '$1ः')
  for (const [from, to] of PHRASES) s = s.split(from).join(to)
  s = s
    // पुजा → पूजा, as a whole word.
    .replace(/(^|[\s,(])पुजा(?=$|[\s,()])/g, '$1पूजा')
    // A श्राद्ध that lost its last letter.
    .replace(/श्राद्(?!ध)/g, 'श्राद्ध')
    // "अष्टमीव्रत" → "अष्टमी व्रत": व्रत is its own word everywhere else.
    .replace(new RegExp(`([${DEVANAGARI}])व्रत`, 'g'), '$1 व्रत')
    // The plural -हरू, long ू: "कर्मचारीहरुका" → "कर्मचारीहरूका".
    .replace(/हरु(?=का|को|ले|लाई|मा|$|[\s,()])/g, 'हरू')
    // बिदा is a day off; विदा is a farewell.
    .replace(/विदा(?=\))/g, 'बिदा')
    // A space before an opening parenthesis: "तीज(महिला ...)" → "तीज (महिला ...)".
    .replace(/([^\s(])\(/g, '$1 (')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}
