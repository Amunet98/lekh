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

        /* Everything below is sourced from nepalicalendar.rat32.com's
           hand-written English calendar, matched day-by-day against this
           file's own festival data (fuzzy-matched, never a blind day-index
           copy, since the two sources sometimes disagree on which
           festivals fall on a given day) and normalised to match this
           table's existing spelling conventions (Shraddha, Brata, Ashtami,
           and translating दिवस as "Day"). Covers 291 of the fragments that
           previously fell through to the mechanical fallback below. */
        "अक्षय तृतीया" to "Akshyaya Tritiya",
        "अचला सप्तमी" to "Achalaa Saptami",
        "अजा एकादशी" to "Ajaa Ekadashi",
        "अजा एकादशीव्रत" to "Ajaa Ekadashi",
        "अधिकमास समाप्ती" to "Adhikmas Samapti",
        "अन्तर्राष्ट्रिय युवा दिवस" to "International Youths Day",
        "अन्नपूर्णा  यात्रा" to "Annapurna Yatra",
        "अपरा एकादशी" to "Apara Ekadashi",
        "अरनिको स्मृति दिवस" to "Araniko Smriti Day",
        "अष्टमी श्राद्ध" to "Ashtami Shraddha",
        "आद्यगुरु शङ्कराचार्य जयन्ती" to "Adhyaguru Shankaracharya Jayanti",
        "आद्यगुरू शंखराचार्य जयन्ती" to "Adhyaguru Shankaracharya Jayanti",
        "आमलकी एकादशी" to "Aamalaki Ekadashi",
        "आमाको मुख हेर्ने" to "Aama ko Mukh Herne",
        "इन्दिरा एकादशी" to "Indira Ekadashi",
        "इन्दिरा एकादशी व्रत" to "Indira Ekadashi Brata",
        "इन्दिरा एकादशीव्रत" to "Indira Ekadashi",
        "ईन्द्रध्वजपातन" to "Indradhwoj Patan",
        "उत्पत्तिका एकादशी" to "Utpattika Ekadashi",
        "ऋषिपञ्चमी" to "Rishi Panchami",
        "ऋषिपञ्चमीव्रत" to "Rishi Panchami Brata",
        "एकादशी श्राद्ध" to "Ekadashi Shraddha",
        "औंसी श्राद्ध" to "Aunsi Shraddha",
        "कतिं पुन्हिः" to "Katim Punhi:",
        "कल्की जयन्ती" to "Kalki Jayanti",
        "कामदा एकादशी" to "Kamada Ekadashi",
        "कामिका एकादशी" to "Kamika Ekadashi",
        "कामिका एकादशी व्रत" to "Kamika Ekadashi Brata",
        "काय  अष्टमी" to "Kaya Ashtami",
        "किजापूजा" to "Kija Puja",
        "किराँत समाजसुधार दिवस" to "Kirant Samaj Sudhar Day",
        "कुमार यात्रा" to "Kumar Yatra",
        "कुष्माण्ड नवमी" to "Kusmanda Nawami",
        "कोजाग्रत पूर्णिमा" to "Kojagrat Purnima",
        "कोजाग्रत व्रत" to "Kojagrat Brata",
        "कोजाग्रतव्रत" to "Kojagrat Brata",
        "खाद्य दिवस" to "Khadhya Day",
        "खिर खाने दिन" to "Khir Khane Din",
        "गठाँमुगचह्नेः" to "Gathanmugcharhe",
        "गणेश चतुर्थी" to "Ganesh Chaturthi",
        "गाई पुजा" to "Gai Puja",
        "गुँलाधर्म आरम्भ" to "Gunladharma Aarambha",
        "गुँलाधर्म समाप्ति" to "Gunla Dharma Samapti",
        "गुरु गोविन्दसिंह जयन्ती" to "Guru Govinda Sinha Jayanti",
        "गुरू गोविन्दसिंह जयन्ती" to "Guru Govinda Sinha Jayanti",
        "गुरू पूर्णिमा" to "Guru Purnima",
        "गुलांँधर्म समाप्ति" to "Gunla Dharma Samapti",
        "गोरखाकाली पूजा" to "Gorakhkali Puja",
        "गोवर्द्धन पूजा" to "Gobardhan Puja",
        "गोश्वामी तुलसीदास जयन्ती" to "Goswasmi Tulashi Das Jayanti",
        "गोसाइँकुण्ड स्नान आरम्भ" to "Gosaikunda Snan Aarambha",
        "गोसाइँकुण्ड स्नान समाप्ति" to "Gosaikunda Snan Samapti",
        "गोसाइँकुण्डस्नान आरम्भ" to "Gosaikunda Snan Aarambha",
        "गोस्वामी तुलसीदास जयन्ती" to "Goswami Tulashi Das",
        "गौरा पर्व" to "Gaura Parba",
        "गौरा सप्तमी" to "Gaura Saptami",
        "घण्टाकर्ण चतुर्दशी" to "Ghantakarna Chaturdashi",
        "चतुर्थी श्राद्ध" to "Chaturthi Shraddha",
        "चतुर्दशी श्राद्ध" to "Chaturdashi Shraddha",
        "चन्द्रोदय" to "Chandrodaya",
        "चाँगुनारायण अखण्डदीप दर्शन" to "Changunarayan Akhandadip Darshan",
        "चाँगुमा माधव नारायण मेला" to "Changuma Madhav Narayan Mela",
        "चिरोत्थान" to "Chirotthan",
        "चीरदाह" to "Chirdaha",
        "चेपाङ चोनाम पर्व" to "Chepang Chonam Parba",
        "चैती छठ" to "Chaiti Chhath",
        "चोभार आदिनाथ स्नान (चोभाद्यः न्हवं)" to "Chobhar Adinath Snan (Chobhadhya: Nhawam)",
        "छठपर्व" to "Chhath Parba",
        "छन्द दिवस" to "Chhanda Day",
        "जगन्नाथ रथयात्रा" to "Jagannath Rathyatra",
        "जनकपुरमा सीता विवाह पञ्चमी मेला" to "Janakpurma Sita Bibah Panchami Mela",
        "जनबहाः कुछि भ्वय्" to "Janabaha: Kuchhi Bhwaya",
        "जनयुद्ध दिवस" to "Jana Yudda Day",
        "जनवहाद्यः न्हवंः" to "Janwahadhya: nhawn:",
        "जया एकादशी" to "Jaya Ekadashi",
        "जातीय भेदभाव तथा छुवाछुत उन्मूलन राष्ट्रिय दिवस" to "Jatiya Bhedbhaw tatha Chuwachut Unmulan Rastriya Day",
        "जितिया पर्व" to "Jitiya Parba",
        "जुगःच:ह्रे पुजा" to "Jug: Cha:Hre Puja",
        "जुगःचह्रे: पुजा" to "Jug: Chahre: Puja",
        "जुम्ला खलङ्गामा चन्दननाथको लिङ्गो ठड्याउने" to "Jumla Khalangama Chandannath ko Lingo Thadyaune",
        "जुम्ला खलङ्गामा चन्दननाथको लिङ्गो ठड्‌याउने" to "Jumla Khalangama Chandannath ko Lingo Thadyaune",
        "टेलिभिजन दिवस" to "Television Day",
        "तुलसी विवाह" to "Tulashi Bibah",
        "तुलसीको दल राख्ने" to "Tulashi ko Dal Rakhne",
        "तृतीय श्राद्ध" to "Tritiya Shraddha",
        "तृतीया" to "Tritiya",
        "तृतीया श्राद्" to "Tritiya Shraddha",
        "तृतीया श्राद्ध" to "Tritiya Shraddha",
        "त्रयोदशी श्राद्ध" to "Trayodashi Shraddha",
        "त्रिवेणी मेला" to "Tribeni Mela",
        "थिंला पुन्हीः" to "Thinla Punhi:",
        "दरखाने दिन" to "Dar Khane Din",
        "दर्शैको टीका २०८१" to "Dashain ko Tika 2081",
        "दर्शैको टीका २०८२" to "Dashain Ko Tika 2082",
        "दशमी श्राद्ध" to "Dashami Shraddha",
        "दशैको टिका" to "Dashain ko Tika",
        "दहिचिउरा खाने दिन" to "Dahi Cheura Khane Din",
        "दिलाचःह्रे:" to "Dilacha:Hre:",
        "दिशी चह्रे:" to "Dishi Charhe",
        "देउपाटनमा त्रिशुल जात्रा" to "Deupatan ma Trishul Jatra",
        "द्वादशी" to "Dwadashi",
        "द्वादशी श्राद्ध" to "Dwadashi Shraddha",
        "द्वितीय श्राद्ध" to "Dwitiya Shraddha",
        "द्वितीया श्राद्ध" to "Dwitiya Shraddha",
        "धनत्रयोदशी" to "Dhantrayodashi",
        "धन्तेरस" to "Dhanteras",
        "धन्वन्तरी जयन्ती" to "Dhanwantari Jayanti",
        "नःलास्वाँ चःह्रे" to "Na:Laswan Cha: Hre",
        "नवमी श्राद्ध" to "Nawami Shraddha",
        "नववर्ष २०८२ आरम्भ" to "New Year 2082 starts",
        "नववर्ष २०८३ आरम्भ" to "Nepali New Year 2083 BS",
        "नाग पञ्चमी" to "Naag Panchami",
        "नाग पञ्चमी (नाग टाँस्ने)" to "Naag Panchami (Naag Tasne)",
        "नागपञ्चमी (नाग टाँस्ने)" to "Naag Panchami (Naag Tasne)",
        "नाला मच्छिन्द्रनाथ रथयात्रा" to "Nala Machindranath Rath Yatra",
        "नाला मच्छिन्द्रनाथ स्नान  (नाला न्हवं)" to "Nala Machindranath Snan (Nala Nwahn)",
        "नाला मच्छिन्द्रनाथ स्नान (नाला न्हवं)" to "Nala Machindranath Snan (Nala Nhawam)",
        "निजामती सेवा दिवस" to "Nijamati Sewa Day",
        "निर्जला एकादशी" to "Nirjala Ekadashi",
        "निशि बार्ने" to "Nishi Barne",
        "नृसिंह जयन्ती" to "Narshinha Jayanti",
        "नेपाल ज्योतिष परिषद् स्थापना दिवस" to "Nepal Jyotish Parishad Sthapana Day",
        "नेपाली सेना दिवस" to "Nepali Sena Day",
        "पचली भैरव यात्रा" to "Pachali Bhairab Yatra",
        "पञ्चमी तथा षष्ठी श्राद्ध" to "Panchami tatha Shasthi Shraddha",
        "पञ्चमी श्राद्ध" to "Panchami Shraddha",
        "परशुराम जयन्ती" to "Parashuram Jayanti",
        "पशुपति क्षेत्रमा माधव नारायण मेला" to "Pashupati Kshetrama Madhav Narayan Mela",
        "पशुपतिनाथ मेला" to "Pashupatinath Mela",
        "पशुपतिनाथको छायाँ दर्शन" to "Pashupatinath ko Chayan Darshan",
        "पापमोचनी एकादशी" to "Paap Mochini Ekadashi",
        "पापमोचिनी एकादशी" to "Paap Mochani Ekadashi",
        "पापाङकुशा एकादशीव्रत" to "Papankusha Ekadashi",
        "पाहाँ (पासा) चह्रे:" to "Pahan (Pasa) Chahre:",
        "पुत्रदा एकादशी" to "Putrada Ekadashi",
        "पुत्रदा एकादशी व्रत" to "Putrada Ekadashi Brata",
        "पूर्णिमा व्रत" to "Purnima Brata",
        "प्रतिपदा श्राद्ध" to "Pratipada Shraddha",
        "बराह जयन्ती" to "Baraha Jayanti",
        "बरूथिनी एकादशी" to "Baruthini Ekadashi",
        "बरूथिनी एकादशीव्रत" to "Baruthini Ekadashi",
        "बलम्वु महालक्ष्मी यात्रा" to "Balambu Mahalaxmi Yatra",
        "बाजुरा बडिमालिका मेला" to "Bajura Badimalika Mela",
        "बाबुको मुख हेर्ने दिन" to "Buba ko Mukh Herne Din",
        "बाला चतुदर्शी" to "Bala Chaturdashi",
        "बाला चतुर्दशी" to "Bala Chaturdashi",
        "बुधाष्टमीव्रत" to "Budhashtami Brata",
        "बैष्णवहरूको अपरा एकादशी व्रत" to "Baishnab haruko Apara Ekadashi Brata",
        "भक्तपुर ब्रम्हायणी यात्रा" to "Bhaktapur Bramhayani Yatra",
        "भक्तपुर विश्वध्वजपातन (विस्काजात्रा)" to "Bhaktapur Biswadhojpatan (Biskajatra)",
        "भक्तपुर विश्वध्वजोत्थान" to "Bhaktapur Bishwadhojothan",
        "भलभल अष्टमी" to "Bhal Bhal Ashtami",
        "भानु सप्तमी" to "Bhanu Saptami",
        "भिष्माष्टमी" to "Bhimashtami",
        "भीमा (जया) एकादशी" to "Bhima (Jaya) Ekadashi",
        "भूमिपूजा" to "Bhumi Puja",
        "भूमिरज" to "Bhumiraj",
        "भैरवाष्टमी" to "Bhairawashtami",
        "भौमाष्टमी" to "Bhaumashtami",
        "भौमाष्टमीव्रत" to "Bhaumashtami Brata",
        "भ्यालेन्टाइन डे" to "Valentine Day",
        "मंगल चौथी" to "Mangal Chauthi",
        "मंगलचौथी" to "Mangal Chauthi",
        "मङ्गल चौथीव्रत" to "Mangal Chauthi Brata",
        "मङ्गलचौथी व्रत" to "Mangal Chauthi Brata",
        "मत्स्यनारायण मेला समाप्ति" to "Matsyanarayan Mela Samapti",
        "मत्स्येजयन्ती" to "Matsyejayanti",
        "मत्स्येनारायण मेला" to "Matsyenarayan Mela",
        "मष्टपूर्णिमा (ज्याःपुन्हिः)" to "Masta Purnima (Jya: Punhi:)",
        "महा नवमी" to "Maha Nawami",
        "महानवमी" to "Maha Nawami",
        "महावीर जयन्ती" to "Mahabir Jayanti",
        "महाशिवरात्रीव्रत" to "Maha Shiva Ratri",
        "महाष्टमी" to "Maha Ashtami",
        "माघस्नान समाप्ति" to "Magh Snan Samapti",
        "माझी समुदायको लदी पूजा" to "Majhi Samudaya ko Ladi Puja",
        "माताति चःह्रे" to "Matati Cha:hre",
        "माताति चःह्रे पूजा" to "Matati Cha:Hre Puja",
        "माधव नारायण मेला" to "Madhav Narayan Mela",
        "मानव वेचविखन विरुद्धको राष्ट्रिय दिवस" to "Manab Bechbikhan Birudda ko Rastriya Day",
        "मिला पुन्हिः" to "Mila Punhi:",
        "मोक्षदा एकादशी" to "Mokshyada Ekadashi",
        "मोरङ" to "Morang",
        "मोहिनी एकादशी" to "Mohini Ekadashi",
        "मोहिनी एकादशी व्रत" to "Mohini Ekadashi Brata",
        "यँया पुन्हिः" to "Yanya Punhi:",
        "यमदीप दान" to "Yamadip Daan",
        "यमदीपदान" to "Yama Deep Daan",
        "यल पञ्चदान" to "Yal Panchadaan",
        "यल मत्या" to "Yal Matya",
        "यें पञ्चदान" to "Yen Panchadaan",
        "यैँया पुन्हिः" to "Yenya Punhi:",
        "रमा एकादशी" to "Rama Ekadashi",
        "रवि सप्तमी" to "Rabi Saptami",
        "रविसप्तमी" to "Rabi Saptami",
        "रवी सप्तमी" to "Rabi Saptami",
        "राधा अष्टमी" to "Radha Ashtami",
        "राम नवमी" to "Ram Nawami",
        "राष्ट्रिय चलचित्र दिवस" to "National Cinema Day",
        "राष्ट्रिय टोपी दिवस" to "National Topi Day",
        "राष्ट्रिय पत्रकारिता दिवस" to "Rastriya Patrakarita Day",
        "राष्ट्रिय फोटो पत्रकारिता दिवस" to "Rastriya Photo Patrakarita Day",
        "राष्ट्रिय भुकम्प सुरक्षा दिवस" to "Rastriya Bhukampa Surakshya Day",
        "राष्ट्रिय सूचना तथा सञ्चार प्रविधि दिवस" to "Rastriya Suchana tatha Sanchar Prawidhi Day",
        "राष्ट्रिय सूचना दिवस" to "Rastriya Suchana Day",
        "रेडियो दिवस" to "Radio Day",
        "रोपाइँ जात्रा" to "Ropain Jatra",
        "ल.पु. मच्छिन्द्रनाथ रथारोहण" to "Lalitpur Rato Matsyendranath Ratharohan",
        "ललितपुर नृसिंह यात्रा" to "Lalitpur Narsimha Yatra",
        "ललितपुर मच्छिन्द्रनाथ रथारोहण" to "Lalitpur Machhindranath Ratharohan",
        "ललितपुर रातो मच्छिन्द्रनाथ रथ यात्रा आरम्भ" to "Lalitpur Rato Machindranath Rath Yatra Aarambha",
        "ललितपुर रातो मच्छिन्द्रनाथ स्नान (बुँगद्यः न्हंवः)" to "Lalitpur Rato Machhendranath Snan (Bungadhya: nhynwa:)",
        "लुतो फाल्ने एवं राँको बाल्ने" to "Luto Falne Ebam Ranko balne",
        "लैंचह्रे:" to "Lainchahre:",
        "लोकतन्त्र दिवस" to "Loktantra Day",
        "ल्हुतिपुन्हीः" to "Lhuti Punhi:",
        "वराह जयन्ती" to "Barah Jayanti",
        "वसन्तपञ्यमी" to "Basanta Panchami",
        "वामन द्वादशी" to "Baman Dwadashi",
        "वायु अष्टमी" to "Bayu Ashtami",
        "वास्तु दिवस" to "Bastu Day",
        "विजया एकादशी" to "Bijaya Ekadashi",
        "विजया एकादशी व्रत" to "Bijaya Ekadashi",
        "विजया दशमी" to "Bijaya Dashami",
        "विरूडा पञ्चमी" to "Biruda Panchami",
        "विवाह पञ्चमी" to "Bibah Panchami",
        "विश्व क्षयरोग दिवस" to "World Leprosy Day",
        "विश्व खाद्य दिवस" to "World Food Day",
        "विश्व गुणस्तर दिवस" to "World Quality Day",
        "विश्व मधुमेह दिवस" to "World Diabetes Day",
        "विश्व मानव अधिकार दिवस" to "World Human Rights Day",
        "विश्वकर्मा पूजा" to "Bishwokarma Puja",
        "वैकुण्ठ चतुर्दशी" to "Baikuntha Chaturdashi",
        "वैतडी विश्वनाथ मन्दिरमा गङ्गादशहरा स्नानमेला" to "Baitadi Bishwanath Mandirma Ganga Dashahara Snan Mela",
        "वैशाख स्नान सुरू" to "Baisakh Snan Suru",
        "वैष्णवहरुको पुत्रदा एकादशी" to "Baishnab haruko Putrada Ekadashi",
        "वैष्णवहरुको योगिनी एकादशी" to "Baishnab haruko Yogini Ekadashi Brata",
        "वैष्णवहरुको योगिनी एकादशीव्रत" to "Baishnab haruko Yogini Ekadashi",
        "व्यास जयन्ती" to "Byas Jayanti",
        "शतबीज छर्ने" to "Shatbij Charne",
        "शहिद दिवस" to "Shahid Day",
        "शिवपार्वती विवाह" to "Shiva Parbati Bibah",
        "शीतलाष्टमी" to "Shitalashtami",
        "श्री पशुपतिनाथमा छायाँ दर्शन" to "Shree Pashupati Nath ma Chayan Darshan",
        "श्रीराम जयन्ती" to "Shree Ram Jayanti",
        "श्रीवल्लभ जयन्ती" to "Shree Ballav Jayanti",
        "श्रीस्वस्थानी व्रत समाप्ति" to "Shree Swasthani Brata Samapti",
        "श्रीस्वस्थानीव्रत आरम्भ" to "Shree Swasthani Brata Suru",
        "श्रीस्वस्थानीव्रत समाप्ति" to "Shree Swasthani Brata Samapti",
        "श्रीस्वस्थानीव्रत सुरू" to "Shree Swasthani Brata Starts",
        "षटतिला एकादशी" to "Shattila Ekadashi",
        "षट्तिला एकादशी" to "Shattila Ekadashi",
        "षष्ठी श्राद्ध" to "Shasthi Shraddha",
        "सप्तमी श्राद्ध" to "Saptami Shraddha",
        "सफला एकादशी" to "Saphala Ekadashi",
        "सम्पत्ति शुद्धीकरण निवारण राष्ट्रिय दिवस" to "Sampati Suddikaran Nibaran Rastriya Day",
        "साउन संक्रान्ती" to "Saune Sankranti",
        "सि पुन्हिः" to "Si Punhi:",
        "सिथिःचःह्रे" to "Sithi:Cha:Hre",
        "सिथिःनखः" to "Sithi:Nakha:",
        "सिथिचःह्रे" to "Sithicha:hre",
        "सिथीः नख" to "Sithi: Nakha",
        "सिथीःनख" to "Sithi: Nakha",
        "सिरूवा पावनी पर्व(सिरूवा पर्व मनाउने झापा" to "Siruwa Pawani Parba (Siruwa Parba Manaune Jhapa",
        "सीता जयन्ती" to "Sita Jayanti",
        "सेतो मच्छिन्द्रनाथ  स्नान" to "Seto Machhindranath Snan",
        "सेतो मच्छिन्द्रनाथ रथयात्रा आरम्भ" to "Seto Machhindranath Rath Yatra Aarambha",
        "सेतो मच्छिन्द्रनाथ स्नान" to "Seto Machhindranath Snan",
        "सोनाम ल्होसार (तामाङ ल्होछार)" to "Sonam Lhosar (Tamang Lhochar)",
        "सोह्रश्राद्ध आरम्भ" to "Sohra Shraddha Aarambha",
        "स्मार्तहरूको अपरा एकादशी व्रत" to "Smartaharuko Apara Ekadashi Brata",
        "स्मार्तहरूको पुत्रदा एकादशी" to "Smarta haruko Putrada Ekadashi",
        "स्मार्तहरूको योगिनी एकादशी" to "Smarta haru ko Yogini Ekadashi",
        "स्मार्तहरूको योगिनी एकादशीव्रत" to "Smartaharuko Yogini Ekadashi",
        "स्याङ्जा लसर्घा आलमदेवी पूजा" to "Syangja Lasargha Alamdevi Puja",
        "स्वःन्ति पारू" to "Swa:nti Paru",
        "स्वयम्भूको छायाँ दर्शन" to "Swayambhu ko Chayan Darshan",
        "स्वाँया पून्हिः" to "Swanya Punhi:",
        "स्वामी शशिधर जयन्ती" to "Swami Shashidhar Jayanti",
        "स्वामी शशीधर जयन्ती" to "Swami Sashidhar Jayanti",
        "हरितालिका व्रत" to "Haritalika Brata",
        "हरिपरिवर्तनी एकादशी" to "Haripariwartini Ekadashi",
        "हरिपरिवर्तिनी एकादशी" to "Haripariwartini Ekadashi",
        "हरिबोधनी एकादशी व्रत" to "Haribodhini Ekadashi Brata",
        "हरिबोधिनी एकादशी" to "Haribodhini Ekadashi",
        "हरिशयनी एकादशी व्रत" to "Harisayani Ekadashi",
        "हरिशयनी एकादशीव्रत" to "Harisayani Ekadashi",
        "हलो बार्ने" to "Halo Barne",
        "हुलाक दिवस" to "Hulak Day",
        "होलिकारम्भ" to "Holikarambha",
        "होली" to "Holi",
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
