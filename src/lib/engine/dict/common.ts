// Everyday words the pattern spells wrong when typed the way people text
// them — mostly a short `a` where the word has ा (gyan → ज्ञन, kripaya → कृपय,
// jhyal → झ्यल, sena → सेन) and clusters the pattern cannot guess (rashtra →
// रश्त्रा). Found 2026-10-15 by running a list of common words through
// convert() and keeping only the ones it got wrong; none of these keys
// shadows an existing entry. Kept in a file of its own, like texting.ts, so
// the owner can review the additions in one place. Left out on purpose:
// keys that are also an English word (has, jungle) or another Nepali word
// (har, tha), and spellings where the typed letters differ from the standard
// form (nindra, samundra) — those are the user's spelling, not a typo of it.
export const COMMON: Record<string, string> = {
  // knowledge, please, window, nation
  gyan: 'ज्ञान',
  gyani: 'ज्ञानी',
  kripaya: 'कृपया',
  jhyal: 'झ्याल',
  rashtra: 'राष्ट्र',
  rastra: 'राष्ट्र',
  rashtriya: 'राष्ट्रिय',
  rastriya: 'राष्ट्रिय',
  // government, law, politics
  sarkar: 'सरकार',
  sarkari: 'सरकारी',
  nagarikta: 'नागरिकता',
  sambidhan: 'संविधान',
  adhikar: 'अधिकार',
  rajniti: 'राजनीति',
  neta: 'नेता',
  chunab: 'चुनाव',
  chunav: 'चुनाव',
  pradhanmantri: 'प्रधानमन्त्री',
  kanun: 'कानुन',
  kanoon: 'कानुन',
  adalat: 'अदालत',
  sena: 'सेना',
  surakshya: 'सुरक्षा',
  // development, ideas, information
  bikas: 'विकास',
  vikas: 'विकास',
  bichar: 'विचार',
  sambandha: 'सम्बन्ध',
  samadhan: 'समाधान',
  jankari: 'जानकारी',
  suchana: 'सूचना',
  sahayata: 'सहायता',
  sewa: 'सेवा',
  seva: 'सेवा',
  mahatwa: 'महत्त्व',
  mahattwa: 'महत्त्व',
  awasyak: 'आवश्यक',
  sajha: 'साझा',
  jhagada: 'झगडा',
  jhagda: 'झगडा',
  // school
  bidhyarthi: 'विद्यार्थी',
  bidyalaya: 'विद्यालय',
  biswabidyalaya: 'विश्वविद्यालय',
  vishwavidyalaya: 'विश्वविद्यालय',
  siksha: 'शिक्षा',
  sikshya: 'शिक्षा',
  sikshak: 'शिक्षक',
  kakshya: 'कक्षा',
  sahitya: 'साहित्य',
  kabita: 'कविता',
  // health, body
  swasthya: 'स्वास्थ्य',
  swastha: 'स्वस्थ',
  sarir: 'शरीर',
  sharir: 'शरीर',
  dukkha: 'दुःख',
  // work, money
  jagir: 'जागिर',
  byapar: 'व्यापार',
  vyapar: 'व्यापार',
  rupaiya: 'रुपैयाँ',
  pardesh: 'परदेश',
  // life, faith, festivals
  jiban: 'जीवन',
  bhagwan: 'भगवान',
  bhagawan: 'भगवान',
  dharma: 'धर्म',
  shanti: 'शान्ति',
  santi: 'शान्ति',
  yatra: 'यात्रा',
  jatra: 'जात्रा',
  chadparba: 'चाडपर्व',
  subha: 'शुभ',
  subh: 'शुभ',
  bibaha: 'विवाह',
  vivah: 'विवाह',
  nach: 'नाच',
  // people
  hajurbua: 'हजुरबुवा',
  swasni: 'स्वास्नी',
  bhanja: 'भान्जा',
  bhanji: 'भान्जी',
  // time
  ghanta: 'घण्टा',
  minet: 'मिनेट',
  aaitabar: 'आइतबार',
  // verbs
  aaunchu: 'आउँछु',
  aauchu: 'आउँछु',
  bujhe: 'बुझेँ',
  // places, distance, things
  pachhadi: 'पछाडि',
  tadha: 'टाढा',
  kapda: 'कपडा',
  gilas: 'गिलास',
  kachaura: 'कचौरा',
  // food
  chaumin: 'चाउमिन',
  chowmein: 'चाउमिन',
  khursani: 'खुर्सानी',
  aanp: 'आँप',
  // than — the comparison particle (भाँडा, a pot, is offered as a variant)
  bhanda: 'भन्दा',
  // or
  wa: 'वा',
}
