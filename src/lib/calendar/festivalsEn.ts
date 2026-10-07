/* English for the festivals a visitor will actually run into — written by
 * hand, entry by entry, never generated.
 *
 * WHY THIS IS A SHORT LIST
 *
 * An earlier attempt (the Android widget's English mode, August 2026) gave
 * every one of the ~450 names in the almanac an English form: 291 copied from
 * a third-party calendar and the rest spelled out letter by letter. Too many
 * came out wrong — "Naaga", "Panchamee", names matched to the wrong festival —
 * and it was taken out. So this covers the festivals that matter, each one
 * checked, and leaves everything else in Nepali only. A missing line is
 * better than a wrong one.
 *
 * SOURCES (2026-10-08)
 *  - Names and who-gets-the-day-off: the Ministry of Home Affairs' public
 *    holiday notice for BS 2083 (Nepal Gazette 2082-11-18), as reproduced by
 *    Pradhan & Associates; spellings follow the forms in common English use
 *    (Wikipedia, Nepal Tourism Board) where the notice's own transliteration
 *    is unusual ("Gatasthapana" → Ghatasthapana, "Chhat" → Chhath).
 *  - What happens: the Nepal Tourism Board festival pages and the Wikipedia
 *    articles on Dashain, Tihar, Indra Jatra, Gai Jatra, Bisket Jatra, Rato
 *    Machhindranath Jatra, Ghode Jatra and Teej.
 *  - Closures during Dashain: travel guides and Kathmandu Post coverage of the
 *    Dashain exodus (offices, banks and many shops shut from Fulpati to Tika;
 *    buses and flights sell out).
 *
 * Keys are the almanac's own spellings, every variant it uses (महाअष्टमी and
 * महाष्टमी, गाई पूजा and गाई पुजा). Note that the almanac has no entry called
 * Laxmi Puja or Mha Puja: those days appear as गाई पूजा and गोरू पूजा, so
 * that is where their English lives. */

export interface FestivalInfo {
  /** The name in the English people use for it. */
  en: string
  /** One sentence on what happens. */
  about: string
  /** Something practical for a visitor — closures, crowds, where to go. */
  note?: string
}

const ENTRIES: [string[], FestivalInfo][] = [
  // ---------- Dashain ----------
  [['घटस्थापना'], {
    en: 'Ghatasthapana — Dashain begins',
    about: 'Barley is sown in a sacred pot of earth; the yellow shoots (jamara) are worn on Tika day.',
    note: 'From now on long-distance buses and domestic flights fill up — book ahead.',
  }],
  [['नवरात्र आरम्भ'], {
    en: 'Navaratri begins',
    about: 'Nine nights of worship of the goddess Durga start today.',
  }],
  [['फूलपाती'], {
    en: 'Fulpati — Dashain, day 7',
    about: 'A sacred bundle of jamara, banana stalks and sugar cane is carried into Kathmandu with a military parade.',
    note: 'Offices, banks and many shops close from today until after Tika, and Kathmandu empties as people travel home.',
  }],
  [['नवपत्रिका प्रवेश'], {
    en: 'Navapatrika Pravesh',
    about: 'The "nine plants" that stand for the goddess are brought into the house shrine, on the same day as Fulpati.',
  }],
  [['महाअष्टमी', 'महाष्टमी'], {
    en: 'Maha Ashtami — Dashain, day 8',
    about: 'Offerings to the fierce forms of Durga; animals are sacrificed at temples across the country.',
  }],
  [['कालरात्रि'], {
    en: 'Kalratri',
    about: '"The black night" of Maha Ashtami, when worship of the goddess goes on through the night.',
  }],
  [['महानवमी', 'महा नवमी'], {
    en: 'Maha Navami — Dashain, day 9',
    about: 'Vehicles and tools are blessed, and Taleju Temple in Kathmandu opens to the public — its one day of the year.',
  }],
  [['विजयादशमी', 'विजया दशमी', 'दशैको टिका', 'दर्शैको टीका २०८१', 'दर्शैको टीका २०८२'], {
    en: 'Vijaya Dashami — Dashain Tika',
    about: 'Elders put red tika and jamara on younger relatives’ foreheads and bless them — the biggest family day of the year.',
    note: 'Most shops and offices are shut; tourist areas such as Thamel and Pokhara Lakeside stay partly open.',
  }],
  [['कोजाग्रत पूर्णिमा'], {
    en: 'Kojagrat Purnima — end of Dashain',
    about: 'The full moon that closes Dashain; people stay up through the night for Laxmi, the goddess of wealth.',
  }],
  [['चैते दशैं', 'चैतेदशैं'], {
    en: 'Chaite Dashain',
    about: 'A smaller Dashain held in spring, in the month of Chaitra.',
  }],

  // ---------- Tihar ----------
  [['धन्तेरस', 'धनत्रयोदशी'], {
    en: 'Dhanteras',
    about: 'A lucky day to buy gold, silver or new kitchen utensils, just before Tihar.',
  }],
  [['काग तिहार', 'कागतिहार'], {
    en: 'Kag Tihar — Tihar, day 1',
    about: 'Crows, seen as messengers of Yama, the god of death, are fed on rooftops.',
  }],
  [['कुकुर तिहार'], {
    en: 'Kukur Tihar — Tihar, day 2',
    about: 'Dogs, strays included, are honoured with flower garlands, tika and a good meal.',
  }],
  [['नरक चतुर्दशी'], {
    en: 'Narak Chaturdashi',
    about: 'The day Krishna is said to have defeated the demon Narakasura; kept together with Kukur Tihar.',
  }],
  [['गाई पूजा', 'गाई पुजा'], {
    en: 'Gai Puja & Laxmi Puja — Tihar, day 3',
    about: 'Cows are worshipped in the morning; at dusk homes are lit with oil lamps and candles to welcome Laxmi, goddess of wealth.',
    note: 'In the evening children go from house to house singing Bhailo.',
  }],
  [['गोरू पूजा'], {
    en: 'Goru Puja & Mha Puja — Tihar, day 4',
    about: 'Oxen are honoured, and Newars perform Mha Puja, a worship of one’s own body, on their new year (Nepal Sambat).',
  }],
  [['गोवर्द्धन पूजा'], {
    en: 'Govardhan Puja',
    about: 'Worship of Govardhan hill, shaped as a small mound of cow dung, on the fourth day of Tihar.',
  }],
  [['भाइटीका'], {
    en: 'Bhai Tika — Tihar, day 5',
    about: 'Sisters give their brothers a seven-coloured tika and a garland of makhamali flowers, praying for their long life.',
  }],
  [['किजा पूजा', 'किजापूजा'], {
    en: 'Kija Puja',
    about: 'The Newar name for Bhai Tika.',
  }],

  // ---------- Kathmandu Valley jatras ----------
  [['कुमारी ईन्द्रजात्रा', 'कुमारी इन्द्रजात्रा', 'ईन्द्रजात्रा'], {
    en: 'Indra Jatra — Kumari Jatra',
    about: 'Kathmandu’s biggest street festival: the living goddess Kumari is pulled through the old city in her chariot, with masked dances at Basantapur.',
    note: 'Public holiday in Kathmandu Valley only.',
  }],
  [['इन्द्रध्वजोत्थान'], {
    en: 'Indra Jatra begins',
    about: 'A tall wooden pole is raised at Basantapur, in front of Hanuman Dhoka, opening eight days of Indra Jatra.',
  }],
  [['इन्द्रध्वजपातन', 'ईन्द्रध्वजपातन'], {
    en: 'Indra Jatra ends',
    about: 'The pole raised at Basantapur is brought down.',
  }],
  [['यँया पुन्हिः'], {
    en: 'Yenya Punhi',
    about: 'The Newar name for the full moon of Indra Jatra.',
  }],
  [['गाईजात्रा (सापारू)', 'गाईजात्रा'], {
    en: 'Gai Jatra',
    about: 'Families who lost someone in the past year join a procession with a cow or a child dressed as one; the day also brings satire and comedy.',
    note: 'Holiday in Kathmandu Valley and for the Newar community.',
  }],
  [['भक्तपुर विश्वध्वजपातन (विस्काजात्रा)', 'भ.पु. विश्वध्वजपातन (विस्काजात्रा)'], {
    en: 'Bisket Jatra',
    about: 'Bhaktapur’s new-year festival: after days of chariot pulling, the giant ceremonial pole is brought down.',
  }],
  [['ललितपुर रातो मच्छिन्द्रनाथ रथ यात्रा आरम्भ', 'ललितपुर रातो मत्स्येन्द्रनाथ रथयात्रा आरम्भ'], {
    en: 'Rato Machhindranath Jatra begins',
    about: 'Patan’s towering chariot of the rain god starts a journey through the city that lasts for weeks.',
  }],
  [['सेतो मच्छिन्द्रनाथ रथयात्रा आरम्भ'], {
    en: 'Seto Machhindranath Jatra begins',
    about: 'Kathmandu’s white Machhindranath is pulled in his chariot through Asan and Indra Chowk.',
  }],
  [['घोडेजात्रा', 'घोडे जात्रा'], {
    en: 'Ghode Jatra',
    about: 'The army holds horse races and displays at Tundikhel; galloping horses are said to keep a buried demon down.',
    note: 'Public holiday in Kathmandu Valley only.',
  }],

  // ---------- other festivals ----------
  [['तीज', 'हरितालिका व्रत'], {
    en: 'Teej (Haritalika)',
    about: 'Women dress in red, fast, and sing and dance at Shiva temples — Pashupatinath above all.',
    note: 'Holiday for women only.',
  }],
  [['जनैपूर्णिमा'], {
    en: 'Janai Purnima',
    about: 'Men who wear the sacred thread (janai) change it, and others tie a protective thread around the wrist.',
  }],
  [['रक्षाबन्धन'], {
    en: 'Raksha Bandhan',
    about: 'Sisters tie a rakhi on their brothers’ wrists.',
  }],
  [['श्रीकृष्णजन्माष्टमी'], {
    en: 'Krishna Janmashtami',
    about: 'Birth of Lord Krishna; Patan’s Krishna Mandir is crowded with devotees through the night.',
  }],
  [['गौरापर्व', 'गौरा पर्व'], {
    en: 'Gaura Parva',
    about: 'Festival of the far west honouring the goddess Gaura (Parvati), with songs and the deuda dance.',
  }],
  [['जितिया पर्व', 'जितियापर्व'], {
    en: 'Jitiya Parva',
    about: 'Mothers, mainly in the Terai, fast for the long life of their children.',
    note: 'Holiday for women who observe it.',
  }],
  [['नागपञ्चमी (नाग टाँस्ने)', 'नाग पञ्चमी (नाग टाँस्ने)', 'नाग पञ्चमी'], {
    en: 'Nag Panchami',
    about: 'Pictures of the serpent gods are pasted above doorways to protect the house.',
  }],
  [['छठ पर्व', 'छठपर्व'], {
    en: 'Chhath Parva',
    about: 'Devotees, mostly from the Terai, make offerings to the setting and rising sun while standing in rivers and ponds.',
  }],
  [['चैती छठ'], {
    en: 'Chaiti Chhath',
    about: 'The spring observance of Chhath, in the month of Chaitra.',
  }],
  [['गौतमबुद्ध जयन्ती'], {
    en: 'Buddha Jayanti',
    about: 'Birth of Gautama Buddha, born in Lumbini; Swayambhu and Boudha fill with pilgrims and butter lamps.',
  }],
  [['महाशिवरात्रि'], {
    en: 'Maha Shivaratri',
    about: 'Night of Shiva: Pashupatinath fills with pilgrims and sadhus from across Nepal and India.',
  }],
  [['माघे संक्रान्ति'], {
    en: 'Maghe Sankranti',
    about: 'First day of Magh, when the days start to warm; families eat sesame sweets, chaku, yam and ghee.',
  }],
  [['माघी पर्व'], {
    en: 'Maghi',
    about: 'New year of the Tharu community, with feasting and dancing.',
  }],
  [['तमुल्होछार'], {
    en: 'Tamu Lhosar',
    about: 'New year of the Gurung community.',
  }],
  [['सोनाम ल्होसार', 'सोनाम ल्होसार (तामाङ ल्होछार)', 'तामाङ ल्होछार'], {
    en: 'Sonam Lhosar',
    about: 'New year of the Tamang community.',
  }],
  [['ग्याल्पो ल्होसार'], {
    en: 'Gyalpo Lhosar',
    about: 'New year of the Sherpa and Tibetan communities; Boudhanath is hung with fresh prayer flags.',
  }],
  [['यमरीपुन्हीः'], {
    en: 'Yomari Punhi',
    about: 'Newar harvest festival at the full moon of Mangsir; families make yomari, sweet steamed dumplings.',
  }],
  [['उधौलीपर्व'], {
    en: 'Udhauli',
    about: 'Kirat festival marking the move down to warmer lands for the winter.',
  }],
  [['फागु पूर्णिमा (होलीपुन्हीः)', 'पहाडी जिल्लामा होली', 'होली'], {
    en: 'Holi (Fagu Purnima)',
    about: 'Festival of colours: expect to be splashed with coloured powder and water balloons in the street.',
    note: 'Holiday in the hill and mountain districts; the Terai celebrates the next day.',
  }],
  [['तराईमा होली', 'तराइमा होली'], {
    en: 'Holi in the Terai',
    about: 'The Terai’s day of Holi, the festival of colours.',
    note: 'Holiday in the Terai districts.',
  }],
  [['होलिकारम्भ'], {
    en: 'Holi begins',
    about: 'A pole hung with cloth is raised at Basantapur, starting the week of Holi.',
  }],
  [['रामनवमी', 'राम नवमी'], {
    en: 'Ram Navami',
    about: 'Birth of Lord Ram, celebrated above all in Janakpur.',
  }],
  [['वसन्तश्रवण श्रीपञ्यमी सरस्वती पूजा'], {
    en: 'Basanta Panchami — Saraswati Puja',
    about: 'Day of Saraswati, goddess of learning; small children write their first letters.',
    note: 'Holiday for schools and colleges.',
  }],
  [['गुरूनानक जयन्ती'], {
    en: 'Guru Nanak Jayanti',
    about: 'Birth of Guru Nanak, founder of Sikhism.',
    note: 'Holiday for Sikhs.',
  }],
  [['दही चिउरा खाने दिन'], {
    en: 'Asar 15 — National Paddy Day',
    about: 'Rice planting day: people work in the muddy fields and eat yogurt with beaten rice (dahi chiura).',
  }],
  [['कुशे औँसी', 'बाबुको मुख हेर्ने दिन'], {
    en: 'Father’s Day (Kushe Aunsi)',
    about: 'Children honour their fathers with sweets and gifts.',
  }],
  [['फाल्गुनन्द जयन्ती'], {
    en: 'Falgunanda Jayanti',
    about: 'Birthday of Falgunanda Lingden, the religious teacher of the Kirat community.',
    note: 'Holiday for the Kirat community.',
  }],
  [['गणेश चतुर्थी'], {
    en: 'Ganesh Chaturthi',
    about: 'Festival of Ganesh, the elephant-headed god who removes obstacles.',
  }],
  [['भानु जयन्ती'], {
    en: 'Bhanu Jayanti',
    about: 'Birthday of Bhanubhakta Acharya, the poet who brought the Ramayana into Nepali.',
  }],

  // ---------- national days ----------
  [['नववर्ष २०८१ आरम्भ', 'नववर्ष २०८२ आरम्भ', 'नववर्ष २०८३ आरम्भ', 'नववर्ष २०८४ आरम्भ'], {
    en: 'Nepali New Year',
    about: 'First day of Baisakh, the start of the Bikram Sambat year.',
  }],
  [['विश्व श्रमिक दिवस'], {
    en: 'International Labour Day',
    about: 'Workers’ day, a public holiday.',
  }],
  [['गणतन्त्र दिवस'], {
    en: 'Republic Day',
    about: 'Marks the end of the monarchy and Nepal becoming a republic in 2008.',
  }],
  [['संविधान दिवस (राष्ट्रिय दिवस)', 'संविधान दिवस'], {
    en: 'Constitution Day (National Day)',
    about: 'Marks the promulgation of Nepal’s constitution in 2015.',
  }],
  [['पृथ्वी जयन्ती', 'राष्ट्रिय एकता दिवस'], {
    en: 'Prithvi Jayanti — National Unity Day',
    about: 'Birthday of King Prithvi Narayan Shah, who unified Nepal.',
  }],
  [['सहिद दिवस', 'शहिद दिवस'], {
    en: 'Martyrs’ Day',
    about: 'Honours those who gave their lives for democracy, beginning with the four martyrs executed under Rana rule in 1941.',
  }],
  [['प्रजातन्त्र दिवस', 'राष्ट्रिय प्रजातन्त्र दिवस'], {
    en: 'Democracy Day',
    about: 'Marks the end of Rana rule in 1951.',
  }],
  [['अन्तर्राष्ट्रिय महिला दिवस'], {
    en: 'International Women’s Day',
    about: 'Women’s day.',
    note: 'Holiday for women employees.',
  }],
  [['नेपाली सेना दिवस'], {
    en: 'Nepal Army Day',
    about: 'The army’s day, kept on Maha Shivaratri.',
  }],
  [['विश्व अपाङ्ग दिवस'], {
    en: 'International Day of Persons with Disabilities',
    about: 'The UN day for the rights of people with disabilities.',
    note: 'Holiday for people with disabilities.',
  }],
  [['क्रिसमस डे'], {
    en: 'Christmas Day',
    about: 'A public holiday in Nepal.',
  }],
]

const BY_NAME = new Map<string, FestivalInfo>()
for (const [names, info] of ENTRIES) for (const name of names) BY_NAME.set(normalize(name), info)

/* The almanac's spacing drifts — "काय  अष्टमी" with two spaces next to
   "काय अष्टमी" — so lookups collapse runs of whitespace on both sides. */
function normalize(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/** The English for one festival name as the almanac writes it, or nothing.
 *  Tries the name as it stands, then without a trailing parenthetical
 *  ("गाईजात्रा (सापारू)" → "गाईजात्रा"). */
export function festivalInfo(name: string): FestivalInfo | undefined {
  const key = normalize(name)
  return BY_NAME.get(key) ?? BY_NAME.get(normalize(key.replace(/\([^()]*\)\s*$/, '')))
}

/** One English line for a day's festivals: the first with an entry, without
 *  repeating a name two of them share (सोनाम ल्होसार, तामाङ ल्होछार). */
export function festivalInfos(names: string[]): FestivalInfo[] {
  const seen = new Set<string>()
  const out: FestivalInfo[] = []
  for (const name of names) {
    const info = festivalInfo(name)
    if (info && !seen.has(info.en)) {
      seen.add(info.en)
      out.push(info)
    }
  }
  return out
}

export const FESTIVAL_ENTRY_COUNT = ENTRIES.length
