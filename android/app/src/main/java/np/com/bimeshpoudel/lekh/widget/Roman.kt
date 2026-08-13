package np.com.bimeshpoudel.lekh.widget

/**
 * Devanagari → Latin, for the widget's English mode.
 *
 * WHY THIS IS THREE LAYERS AND NOT ONE TABLE
 *
 * The calendar's fixed vocabulary — twelve months, seven weekdays, sixteen
 * tithis, ten digits — is small, closed and known, so it is written out by
 * hand and is simply correct.
 *
 * Festival names are neither small nor closed: the bundled data alone holds
 * 452 distinct fragments, and the web app refreshes the table daily from the
 * upstream almanac, so a name nobody has ever seen can arrive tomorrow. A hand
 * table can therefore never be complete, and a purely mechanical
 * transliterator gets the famous names wrong in ways people notice — तीज comes
 * out "teeja" because no letter-by-letter mapping can know the final vowel is
 * silent.
 *
 * So: [FESTIVALS] gets the names that matter exactly right, [WORDS] catches the
 * handful of components that recur across almost every other name (पूजा,
 * जयन्ती, दिवस, पर्व…), and [transliterate] handles whatever is left. The
 * result degrades rather than fails — an unknown name reads approximately
 * instead of not at all.
 *
 * The romanization style is deliberately plain: no diacritics, no IAST. This is
 * read at a glance on a home screen, not cited.
 */
object Roman {

    val monthNames = arrayOf(
        "Baishakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
        "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
    )
    val weekdayNames = arrayOf(
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    )
    val weekdayShort = arrayOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    /** All sixteen tithis in the data, spelled as Nepali sources usually do. */
    private val TITHI = mapOf(
        "प्रतिपदा" to "Pratipada",
        // Spelled with a doubled द in the source data; keyed as it is written
        // there, because a key that does not match is a silent miss.
        "द्दितीया" to "Dwitiya",
        "तृतीया" to "Tritiya",
        "चतुर्थी" to "Chaturthi",
        "पञ्चमी" to "Panchami",
        "षष्ठी" to "Shashthi",
        "सप्तमी" to "Saptami",
        "अष्टमी" to "Ashtami",
        "नवमी" to "Navami",
        "दशमी" to "Dashami",
        "एकादशी" to "Ekadashi",
        "द्वादशी" to "Dwadashi",
        "त्रयोदशी" to "Trayodashi",
        "चतुर्दशी" to "Chaturdashi",
        "पुर्णिमा" to "Purnima",
        "औशी" to "Aunsi",
    )

    /**
     * The festivals worth getting exactly right — every one that falls on a
     * gazetted holiday in the bundled range, plus the well-known observances
     * that do not. Ranked by holiday weight, not by my guess at importance.
     */
    private val FESTIVALS = mapOf(
        "घटस्थापना" to "Ghatasthapana",
        "फूलपाती" to "Fulpati",
        "महाअष्टमी" to "Maha Ashtami",
        "कालरात्रि" to "Kalratri",
        "नवपत्रिका प्रवेश" to "Nawapatrika Prawesh",
        "नवरात्र आरम्भ" to "Navaratri begins",
        "विजयादशमी" to "Bijaya Dashami",
        "चैते दशैं" to "Chaite Dashain",
        "चैतेदशैं" to "Chaite Dashain",
        "कुकुर तिहार" to "Kukur Tihar",
        "काग तिहार" to "Kag Tihar",
        "कागतिहार" to "Kag Tihar",
        "गाई पूजा" to "Gai Puja",
        "गोरू पूजा" to "Goru Puja",
        "किजा पूजा" to "Kija Puja",
        "भाइटीका" to "Bhai Tika",
        "नरक चतुर्दशी" to "Narak Chaturdashi",
        "छठ पर्व" to "Chhath",
        "जनैपूर्णिमा" to "Janai Purnima",
        "गाईजात्रा (सापारू)" to "Gai Jatra (Saparu)",
        "श्रीकृष्णजन्माष्टमी" to "Krishna Janmashtami",
        "गौतमबुद्ध जयन्ती" to "Buddha Jayanti",
        "महाशिवरात्रि" to "Maha Shivaratri",
        "रामनवमी" to "Ram Navami",
        "फागु पूर्णिमा (होलीपुन्हीः)" to "Fagu Purnima (Holi)",
        "माघे संक्रान्ति" to "Maghe Sankranti",
        "माघी पर्व" to "Maghi",
        "उधौलीपर्व" to "Udhauli",
        "सोनाम ल्होसार" to "Sonam Lhosar",
        "तामाङ ल्होछार" to "Tamang Lhosar",
        "तमुल्होछार" to "Tamu Lhosar",
        "ग्याल्पो ल्होसार" to "Gyalpo Lhosar",
        "तोल ल्होसार" to "Tol Lhosar",
        "तोल ल्होछार" to "Tol Lhosar",
        "यमरीपुन्हीः" to "Yomari Punhi",
        "स्वाँया पुन्हिः" to "Swanya Punhi",
        "स्याक्वःत्याक्वः" to "Syakwa Tyakwa",
        "सिलाचह्रे:" to "Silachahre",
        "कुमारी इन्द्रजात्रा" to "Kumari Indra Jatra",
        "इन्द्रध्वजोत्थान" to "Indra Dhwaja Utthan",
        "इन्द्रध्वजपातन" to "Indra Dhwaja Patan",
        "मातातीर्थ औंसी" to "Mata Tirtha Aunsi",
        "कुशे औँसी" to "Kushe Aunsi",
        "दर्श श्राद्ध" to "Darsha Shraddha",
        "दर्शश्राद्ध" to "Darsha Shraddha",
        "ऋषितर्पणी" to "Rishi Tarpani",
        "अष्टमीव्रत" to "Ashtami Brata",
        "पूर्णिमाव्रत" to "Purnima Brata",
        "पापाङकुशा एकादशी" to "Papankusha Ekadashi",
        "गोरखकाली पूजा" to "Gorakhkali Puja",
        "डाला पूजा" to "Dala Puja",
        "अन्नपूर्णा यात्रा" to "Annapurna Yatra",
        "पनौती स्नान" to "Panauti Snan",
        "तुलसी रोप्ने" to "Tulasi Ropne",
        "कुमार षष्ठी" to "Kumar Shashthi",
        "शनि जयन्ती" to "Shani Jayanti",
        "भानु जयन्ती" to "Bhanu Jayanti",
        "पृथ्वी जयन्ती" to "Prithvi Jayanti",
        "गणतन्त्र दिवस" to "Republic Day",
        "संविधान दिवस (राष्ट्रिय दिवस)" to "Constitution Day",
        "राष्ट्रिय प्रजातन्त्र दिवस" to "National Democracy Day",
        "राष्ट्रिय एकता दिवस" to "National Unity Day",
        "निर्वाचन दिवस" to "Election Day",
        "सहिद दिवस" to "Martyrs' Day",
        "अन्तर्राष्ट्रिय महिला दिवस" to "International Women's Day",
        "विश्व श्रमिक दिवस" to "International Workers' Day",
        "विश्व जनसंख्या दिवस" to "World Population Day",
        "क्रिसमस डे" to "Christmas Day",
        "औंसी" to "Aunsi",
    )

    /**
     * Components that recur across names the exact table does not cover.
     * Matched longest-first so एकादशी wins over दशी, and each match is spaced
     * out from its neighbours — अष्टमीव्रत becoming "Ashtami Brata" rather
     * than "AshtamiBrata" is the point.
     */
    private val WORDS = mapOf(
        "अन्तर्राष्ट्रिय" to "International",
        "गुँलाधर्म" to "Gunla Dharma",
        "संक्रान्ति" to "Sankranti",
        "चतुर्दशी" to "Chaturdashi",
        "एकादशी" to "Ekadashi",
        "पूर्णिमा" to "Purnima",
        "राष्ट्रिय" to "National",
        "नववर्ष" to "New Year",
        "श्राद्ध" to "Shraddha",
        "ल्होसार" to "Lhosar",
        "ल्होछार" to "Lhosar",
        "जयन्ती" to "Jayanti",
        "अष्टमी" to "Ashtami",
        "महिला" to "Women's",
        "तिहार" to "Tihar",
        "जात्रा" to "Jatra",
        "यात्रा" to "Yatra",
        "आरम्भ" to "begins",
        "पूजा" to "Puja",
        "दिवस" to "Day",
        "दशैं" to "Dashain",
        "विश्व" to "World",
        "सहिद" to "Martyrs'",
        "औंसी" to "Aunsi",
        "औँसी" to "Aunsi",
        "होली" to "Holi",
        "स्नान" to "Snan",
        "पर्व" to "Parva",
        "व्रत" to "Brata",
        "मेला" to "Mela",
    )

    private val WORD_KEYS = WORDS.keys.sortedByDescending { it.length }

    fun tithi(nepali: String): String =
        if (nepali.isEmpty()) "" else TITHI[nepali] ?: festival(nepali)

    /**
     * A festival name in Latin script: exact table, then component table, then
     * letter-by-letter. Whatever comes back is readable — never empty, never
     * the original Devanagari.
     */
    fun festival(nepali: String): String {
        FESTIVALS[nepali]?.let { return it }

        val out = StringBuilder()
        val pending = StringBuilder()
        var i = 0
        while (i < nepali.length) {
            val hit = WORD_KEYS.firstOrNull { nepali.startsWith(it, i) }
            if (hit != null) {
                if (pending.isNotEmpty()) {
                    out.append(transliterate(pending.toString())); pending.clear()
                }
                out.append(' ').append(WORDS[hit]).append(' ')
                i += hit.length
            } else {
                pending.append(nepali[i]); i++
            }
        }
        if (pending.isNotEmpty()) out.append(transliterate(pending.toString()))
        return titleCase(out.toString().replace(Regex("\\s+"), " ").trim())
    }

    /** 2083 → "2083". Devanagari digits back to ASCII, everything else kept. */
    fun digits(value: Any): String = buildString {
        for (ch in value.toString()) {
            val d = DEVANAGARI_DIGITS.indexOf(ch)
            append(if (d >= 0) ('0' + d) else ch)
        }
    }

    private const val DEVANAGARI_DIGITS = "०१२३४५६७८९"

    private val CONSONANTS = mapOf(
        'क' to "k", 'ख' to "kh", 'ग' to "g", 'घ' to "gh", 'ङ' to "ng",
        'च' to "ch", 'छ' to "chh", 'ज' to "j", 'झ' to "jh", 'ञ' to "n",
        'ट' to "t", 'ठ' to "th", 'ड' to "d", 'ढ' to "dh", 'ण' to "n",
        'त' to "t", 'थ' to "th", 'द' to "d", 'ध' to "dh", 'न' to "n",
        'प' to "p", 'फ' to "ph", 'ब' to "b", 'भ' to "bh", 'म' to "m",
        'य' to "y", 'र' to "r", 'ल' to "l", 'व' to "w",
        'श' to "sh", 'ष' to "sh", 'स' to "s", 'ह' to "h",
        /* Precomposed nukta letters (U+0958–U+095F), written as escapes because
           the same letters can also be typed as base + combining nukta and the
           two look identical in an editor — a literal here would silently be
           the two-character form and never match. The combining form is
           stripped in transliterate() instead. */
        '\u0958' to "k", '\u0959' to "kh", '\u095A' to "g", '\u095B' to "j",
        '\u095C' to "d", '\u095D' to "dh", '\u095E' to "ph", '\u095F' to "y",
    )

    private val VOWELS = mapOf(
        'अ' to "a", 'आ' to "aa", 'इ' to "i", 'ई' to "ee", 'उ' to "u", 'ऊ' to "oo",
        'ए' to "e", 'ऐ' to "ai", 'ओ' to "o", 'औ' to "au", 'ऋ' to "ri",
    )

    /** Vowel signs. Each one cancels the inherent 'a' of the consonant before it. */
    private val MATRAS = mapOf(
        'ा' to "aa", 'ि' to "i", 'ी' to "ee", 'ु' to "u", 'ू' to "oo",
        'े' to "e", 'ै' to "ai", 'ो' to "o", 'ौ' to "au", 'ृ' to "ri",
    )

    private const val HALANT = '्'

    /**
     * Letter-by-letter transliteration.
     *
     * Devanagari consonants carry an inherent 'a' unless a vowel sign or a
     * halant cancels it, so the walk keeps one bit of state — whether an
     * unconsumed inherent 'a' is owed — and emits it lazily. Conjuncts need no
     * special handling: they are just consonant-halant-consonant, and the
     * halant clearing the flag is exactly right.
     *
     * The final inherent 'a' is kept (आरम्भ → "aarambha"). Nepali retains it
     * far more often than Hindi does, and where it should not be there the
     * name is usually well-known enough to be in [FESTIVALS] anyway.
     */
    private fun transliterate(s: String): String {
        // ज्ञ is the one conjunct that is not the sum of its parts: j + ny
        // would give "jny" where every Nepali speaker says "gy".
        val src = s
            .replace("ज्ञ", "ग्य")
            .replace("ॐ", "om")
            // Combining nukta: drop it and let the base consonant stand. The
            // sounds it marks (z, f, q) barely occur in Nepali festival names,
            // and a dropped diacritic reads better than a dropped letter.
            .replace("\u093C", "")
        val out = StringBuilder()
        var owesA = false
        fun settle() { if (owesA) out.append('a'); owesA = false }

        for (ch in src) {
            when {
                CONSONANTS.containsKey(ch) -> { settle(); out.append(CONSONANTS[ch]); owesA = true }
                MATRAS.containsKey(ch) -> { owesA = false; out.append(MATRAS[ch]) }
                ch == HALANT -> owesA = false
                VOWELS.containsKey(ch) -> { settle(); out.append(VOWELS[ch]) }
                // Anusvara and chandrabindu both nasalise; visarga aspirates.
                ch == 'ं' || ch == 'ँ' -> { settle(); out.append('n') }
                ch == 'ः' -> { settle(); out.append('h') }
                ch in DEVANAGARI_DIGITS -> { settle(); out.append('0' + DEVANAGARI_DIGITS.indexOf(ch)) }
                // Avagraha and the danda are punctuation with no Latin use here.
                ch == 'ऽ' || ch == '।' -> settle()
                else -> { settle(); out.append(ch) }
            }
        }
        settle()
        return out.toString()
    }

    private fun titleCase(s: String): String = s.split(' ').joinToString(" ") { word ->
        // Only lift the first letter; words already capitalised by the tables
        // above must survive, and so must an all-caps abbreviation.
        if (word.isEmpty()) word else word[0].uppercaseChar() + word.substring(1)
    }
}
