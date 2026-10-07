/* The phrasebook on Tools: what a visitor needs to say, in Nepali a person
 * would actually say it — polite forms (-नुहोस्) throughout, because that is
 * how a stranger is spoken to. Written by hand and cross-checked against the
 * Wikivoyage Nepali phrasebook (2026-10-08); nothing here is machine
 * translated, so it works offline and does not drift.
 *
 * `say` is filled in only where pronounce() would mislead a reader; every
 * other line's pronunciation is generated, the same as Translate's. */

export interface Phrase {
  en: string
  ne: string
  /** Hand-written pronunciation, when the generated one is not good enough. */
  say?: string
}

export interface PhraseGroup {
  id: string
  label: string
  phrases: Phrase[]
}

export const PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'basics',
    label: 'Basics',
    phrases: [
      { en: 'Hello / Goodbye', ne: 'नमस्ते' },
      { en: 'Thank you', ne: 'धन्यवाद' },
      { en: 'How are you?', ne: 'तपाईंलाई कस्तो छ?' },
      { en: 'I’m fine', ne: 'म ठिक छु।' },
      { en: 'What is your name?', ne: 'तपाईंको नाम के हो?' },
      { en: 'My name is …', ne: 'मेरो नाम … हो।' },
      { en: 'Yes / No', ne: 'हो / होइन', say: 'Ho / hoina' },
      { en: 'Excuse me / Sorry', ne: 'माफ गर्नुहोस्।', say: 'Maaf garnuhos.' },
      { en: 'I don’t understand', ne: 'मैले बुझिनँ।' },
      { en: 'Do you speak English?', ne: 'तपाईं अंग्रेजी बोल्नुहुन्छ?' },
      { en: 'Please speak slowly', ne: 'बिस्तारै बोल्नुहोस्।' },
    ],
  },
  {
    id: 'around',
    label: 'Getting around',
    phrases: [
      { en: 'Where is …?', ne: '… कहाँ छ?' },
      { en: 'Please take me to …', ne: 'मलाई … लैजानुहोस्।' },
      { en: 'How much to go to …?', ne: '… जान कति लाग्छ?' },
      { en: 'Please charge by the meter', ne: 'मिटर अनुसार लिनुहोस्।', say: 'Meter anusar linuhos.' },
      { en: 'Stop here, please', ne: 'यहीँ रोक्नुहोस्।' },
      { en: 'Left / Right / Straight on', ne: 'देब्रे / दाहिने / सिधा' },
      { en: 'Which bus goes to …?', ne: '… जाने बस कुन हो?' },
      { en: 'How far is it?', ne: 'कति टाढा छ?' },
    ],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    phrases: [
      { en: 'How much is this?', ne: 'यो कति हो?' },
      { en: 'That’s too expensive', ne: 'धेरै महँगो भयो।' },
      { en: 'Can you make it cheaper?', ne: 'अलि सस्तो गर्नुहोस् न।' },
      { en: 'I’ll take it', ne: 'म यो लिन्छु।' },
      { en: 'Do you take cards?', ne: 'कार्ड चल्छ?', say: 'Card chalchha?' },
      { en: 'Where is an ATM?', ne: 'एटिएम कहाँ छ?', say: 'ATM kahan chha?' },
    ],
  },
  {
    id: 'food',
    label: 'Food & stay',
    phrases: [
      { en: 'Water, please', ne: 'पानी दिनुहोस्।' },
      { en: 'Not spicy, please', ne: 'पिरो नहाल्नुहोस्।' },
      { en: 'I’m vegetarian', ne: 'म शाकाहारी हुँ।' },
      { en: 'It’s delicious!', ne: 'मीठो छ!' },
      { en: 'The bill, please', ne: 'बिल ल्याउनुहोस्।' },
      { en: 'Is this water safe to drink?', ne: 'यो पानी पिउन हुन्छ?' },
      { en: 'Do you have a room?', ne: 'कोठा पाइन्छ?' },
      { en: 'How much for one night?', ne: 'एक रातको कति हो?', say: 'Ek ratko kati ho?' },
      { en: 'Where is the toilet?', ne: 'ट्वाइलेट कहाँ छ?', say: 'Toilet kahan chha?' },
      { en: 'Is there Wi-Fi?', ne: 'वाइफाइ छ?', say: 'Wi-Fi chha?' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    phrases: [
      { en: 'Help!', ne: 'बचाउनुहोस्!' },
      { en: 'I need a doctor', ne: 'मलाई डाक्टर चाहियो।', say: 'Malai doctor chahiyo.' },
      { en: 'Please call the police', ne: 'प्रहरी बोलाउनुहोस्।' },
      { en: 'Please take me to a hospital', ne: 'मलाई अस्पताल लैजानुहोस्।' },
      { en: 'I’m not feeling well', ne: 'मलाई सन्चो छैन।' },
      { en: 'I have altitude sickness', ne: 'मलाई लेक लाग्यो।' },
      { en: 'I’m lost', ne: 'म बाटो बिराएँ।' },
      { en: 'I lost my bag', ne: 'मेरो झोला हरायो।' },
    ],
  },
]

/* Nepal's emergency lines, as given by embassy and travel advisories
   (2026-10-08). 112 is not reliable in Nepal, so it is not listed. */
export const EMERGENCY_NUMBERS: { label: string; ne: string; number: string }[] = [
  { label: 'Police', ne: 'प्रहरी', number: '100' },
  { label: 'Tourist Police', ne: 'पर्यटक प्रहरी', number: '1144' },
  { label: 'Ambulance', ne: 'एम्बुलेन्स', number: '102' },
  { label: 'Fire', ne: 'दमकल', number: '101' },
]
