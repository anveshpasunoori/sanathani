import { useStore } from './data/store';
import { SCRIPT_OF, type Lang } from './engine/names';
import { fromTelugu } from './engine/script';

const EN = {
  home: 'Home', calendar: 'Calendar', events: 'Family', familyEvents: 'Family Events', pooja: 'Pooja', songs: 'Songs', astro: 'Horoscope', ask: 'Ask', settings: 'Settings',
  askPlaceholder: 'Ask anything about Thithi, Panchangam, family events, or auspicious timings…',
  todayPanchang: "Today's Panchangam", thithi: 'Thithi', nakshatra: 'Nakshatra', yoga: 'Yoga', karana: 'Karana',
  paksha: 'Paksha', month: 'Month', year: 'Year', sunrise: 'Sunrise', sunset: 'Sunset', until: 'until',
  rahu: 'Rahu Kalam', yama: 'Yamagandam', gulika: 'Gulika Kalam', abhijit: 'Abhijit Muhurta',
  timings: 'Timings', upcomingFamily: 'Upcoming family events', upcomingObs: 'Festivals & observances',
  guidance: "Today's traditional guidance", addEvent: 'Add event', noEvents: 'No family events yet.',
  save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', back: 'Back', next: 'Next', skip: 'Skip',
  signIn: 'Sign in', account: 'Account', sample: 'Sample', today: 'Today', tomorrow: 'Tomorrow', inDays: 'in {n} days',
};
type Key = keyof typeof EN;

const TE: Partial<Record<Key, string>> = {
  home: 'హోమ్', calendar: 'క్యాలెండర్', events: 'కుటుంబం', familyEvents: 'కుటుంబ కార్యక్రమాలు', pooja: 'పూజ', songs: 'పాటలు', astro: 'జాతకం', ask: 'అడగండి', settings: 'సెట్టింగ్స్',
  askPlaceholder: 'తిథి, పంచాంగం, కుటుంబ కార్యక్రమాలు లేదా ముహూర్తాల గురించి అడగండి…',
  todayPanchang: 'నేటి పంచాంగం', thithi: 'తిథి', nakshatra: 'నక్షత్రం', yoga: 'యోగం', karana: 'కరణం',
  paksha: 'పక్షం', month: 'మాసం', year: 'సంవత్సరం', sunrise: 'సూర్యోదయం', sunset: 'సూర్యాస్తమయం', until: 'వరకు',
  rahu: 'రాహుకాలం', yama: 'యమగండం', gulika: 'గుళిక కాలం', abhijit: 'అభిజిత్ ముహూర్తం',
  timings: 'సమయాలు', upcomingFamily: 'రాబోయే కుటుంబ కార్యక్రమాలు', upcomingObs: 'పండుగలు & వ్రతాలు',
  guidance: 'నేటి సంప్రదాయ సూచనలు', addEvent: 'కార్యక్రమం చేర్చండి', noEvents: 'ఇంకా కార్యక్రమాలు లేవు.',
  save: 'సేవ్', cancel: 'రద్దు', edit: 'మార్చు', delete: 'తొలగించు', back: 'వెనుకకు', next: 'తదుపరి', skip: 'దాటవేయి',
  signIn: 'సైన్ ఇన్', account: 'ఖాతా', sample: 'నమూనా', today: 'ఈ రోజు', tomorrow: 'రేపు', inDays: '{n} రోజుల్లో',
};

// Kannada, Tamil, Malayalam, Hindi and Marathi: first pass, to be checked by native speakers.
const KN: Partial<Record<Key, string>> = {
  home: 'ಮುಖಪುಟ', calendar: 'ಕ್ಯಾಲೆಂಡರ್', events: 'ಕುಟುಂಬ', familyEvents: 'ಕುಟುಂಬದ ಕಾರ್ಯಕ್ರಮಗಳು', pooja: 'ಪೂಜೆ', songs: 'ಹಾಡುಗಳು', astro: 'ಜಾತಕ', ask: 'ಕೇಳಿ', settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
  askPlaceholder: 'ತಿಥಿ, ಪಂಚಾಂಗ, ಕುಟುಂಬದ ಕಾರ್ಯಕ್ರಮಗಳು ಅಥವಾ ಮುಹೂರ್ತದ ಬಗ್ಗೆ ಕೇಳಿ…',
  todayPanchang: 'ಇಂದಿನ ಪಂಚಾಂಗ', thithi: 'ತಿಥಿ', nakshatra: 'ನಕ್ಷತ್ರ', yoga: 'ಯೋಗ', karana: 'ಕರಣ',
  paksha: 'ಪಕ್ಷ', month: 'ಮಾಸ', year: 'ಸಂವತ್ಸರ', sunrise: 'ಸೂರ್ಯೋದಯ', sunset: 'ಸೂರ್ಯಾಸ್ತ', until: 'ವರೆಗೆ',
  rahu: 'ರಾಹು ಕಾಲ', yama: 'ಯಮಗಂಡ', gulika: 'ಗುಳಿಕ ಕಾಲ', abhijit: 'ಅಭಿಜಿತ್ ಮುಹೂರ್ತ',
  timings: 'ಸಮಯಗಳು', upcomingFamily: 'ಮುಂಬರುವ ಕುಟುಂಬದ ಕಾರ್ಯಕ್ರಮಗಳು', upcomingObs: 'ಹಬ್ಬಗಳು ಮತ್ತು ವ್ರತಗಳು',
  guidance: 'ಇಂದಿನ ಸಂಪ್ರದಾಯ ಸಲಹೆ', addEvent: 'ಕಾರ್ಯಕ್ರಮ ಸೇರಿಸಿ', noEvents: 'ಇನ್ನೂ ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ.',
  save: 'ಉಳಿಸಿ', cancel: 'ರದ್ದು', edit: 'ತಿದ್ದು', delete: 'ಅಳಿಸಿ', back: 'ಹಿಂದೆ', next: 'ಮುಂದೆ', skip: 'ಬಿಟ್ಟುಬಿಡಿ',
  signIn: 'ಸೈನ್ ಇನ್', account: 'ಖಾತೆ', sample: 'ಮಾದರಿ', today: 'ಇಂದು', tomorrow: 'ನಾಳೆ', inDays: '{n} ದಿನಗಳಲ್ಲಿ',
};
const TA: Partial<Record<Key, string>> = {
  home: 'முகப்பு', calendar: 'நாட்காட்டி', events: 'குடும்பம்', familyEvents: 'குடும்ப நிகழ்வுகள்', pooja: 'பூஜை', songs: 'பாடல்கள்', astro: 'ஜாதகம்', ask: 'கேளுங்கள்', settings: 'அமைப்புகள்',
  askPlaceholder: 'திதி, பஞ்சாங்கம், குடும்ப நிகழ்வுகள் அல்லது நல்ல நேரம் பற்றி கேளுங்கள்…',
  todayPanchang: 'இன்றைய பஞ்சாங்கம்', thithi: 'திதி', nakshatra: 'நட்சத்திரம்', yoga: 'யோகம்', karana: 'கரணம்',
  paksha: 'பட்சம்', month: 'மாதம்', year: 'வருடம்', sunrise: 'சூரிய உதயம்', sunset: 'சூரிய அஸ்தமனம்', until: 'வரை',
  rahu: 'ராகு காலம்', yama: 'எமகண்டம்', gulika: 'குளிகை', abhijit: 'அபிஜித் முகூர்த்தம்',
  timings: 'நேரங்கள்', upcomingFamily: 'வரவிருக்கும் குடும்ப நிகழ்வுகள்', upcomingObs: 'பண்டிகைகள் & விரதங்கள்',
  guidance: 'இன்றைய பாரம்பரிய வழிகாட்டல்', addEvent: 'நிகழ்வைச் சேர்', noEvents: 'இன்னும் நிகழ்வுகள் இல்லை.',
  save: 'சேமி', cancel: 'ரத்து', edit: 'திருத்து', delete: 'நீக்கு', back: 'பின்', next: 'அடுத்து', skip: 'தவிர்',
  signIn: 'உள்நுழை', account: 'கணக்கு', sample: 'மாதிரி', today: 'இன்று', tomorrow: 'நாளை', inDays: '{n} நாட்களில்',
};
const ML: Partial<Record<Key, string>> = {
  home: 'ഹോം', calendar: 'കലണ്ടർ', events: 'കുടുംബം', familyEvents: 'കുടുംബ പരിപാടികൾ', pooja: 'പൂജ', songs: 'പാട്ടുകൾ', astro: 'ജാതകം', ask: 'ചോദിക്കൂ', settings: 'ക്രമീകരണങ്ങൾ',
  askPlaceholder: 'തിഥി, പഞ്ചാംഗം, കുടുംബ പരിപാടികൾ, മുഹൂർത്തം എന്നിവയെക്കുറിച്ച് ചോദിക്കൂ…',
  todayPanchang: 'ഇന്നത്തെ പഞ്ചാംഗം', thithi: 'തിഥി', nakshatra: 'നക്ഷത്രം', yoga: 'യോഗം', karana: 'കരണം',
  paksha: 'പക്ഷം', month: 'മാസം', year: 'വർഷം', sunrise: 'സൂര്യോദയം', sunset: 'സൂര്യാസ്തമയം', until: 'വരെ',
  rahu: 'രാഹുകാലം', yama: 'യമകണ്ടം', gulika: 'ഗുളികകാലം', abhijit: 'അഭിജിത് മുഹൂർത്തം',
  timings: 'സമയങ്ങൾ', upcomingFamily: 'വരാനിരിക്കുന്ന കുടുംബ പരിപാടികൾ', upcomingObs: 'ഉത്സവങ്ങളും വ്രതങ്ങളും',
  guidance: 'ഇന്നത്തെ പരമ്പരാഗത നിർദേശം', addEvent: 'പരിപാടി ചേർക്കൂ', noEvents: 'ഇതുവരെ പരിപാടികളൊന്നുമില്ല.',
  save: 'സേവ്', cancel: 'റദ്ദാക്കൂ', edit: 'തിരുത്തൂ', delete: 'ഇല്ലാതാക്കൂ', back: 'പിന്നോട്ട്', next: 'അടുത്തത്', skip: 'ഒഴിവാക്കൂ',
  signIn: 'സൈൻ ഇൻ', account: 'അക്കൗണ്ട്', sample: 'സാമ്പിൾ', today: 'ഇന്ന്', tomorrow: 'നാളെ', inDays: '{n} ദിവസത്തിനുള്ളിൽ',
};
const HI: Partial<Record<Key, string>> = {
  home: 'होम', calendar: 'कैलेंडर', events: 'परिवार', familyEvents: 'पारिवारिक कार्यक्रम', pooja: 'पूजा', songs: 'भजन', astro: 'कुंडली', ask: 'पूछें', settings: 'सेटिंग्स',
  askPlaceholder: 'तिथि, पंचांग, पारिवारिक कार्यक्रम या मुहूर्त के बारे में पूछें…',
  todayPanchang: 'आज का पंचांग', thithi: 'तिथि', nakshatra: 'नक्षत्र', yoga: 'योग', karana: 'करण',
  paksha: 'पक्ष', month: 'मास', year: 'संवत्सर', sunrise: 'सूर्योदय', sunset: 'सूर्यास्त', until: 'तक',
  rahu: 'राहु काल', yama: 'यमगंड', gulika: 'गुलिक काल', abhijit: 'अभिजित मुहूर्त',
  timings: 'समय', upcomingFamily: 'आने वाले पारिवारिक कार्यक्रम', upcomingObs: 'त्योहार और व्रत',
  guidance: 'आज का पारंपरिक मार्गदर्शन', addEvent: 'कार्यक्रम जोड़ें', noEvents: 'अभी कोई कार्यक्रम नहीं है।',
  save: 'सहेजें', cancel: 'रद्द करें', edit: 'बदलें', delete: 'हटाएँ', back: 'पीछे', next: 'आगे', skip: 'छोड़ें',
  signIn: 'साइन इन', account: 'खाता', sample: 'नमूना', today: 'आज', tomorrow: 'कल', inDays: '{n} दिनों में',
};
const MR: Partial<Record<Key, string>> = {
  home: 'मुख्यपृष्ठ', calendar: 'दिनदर्शिका', events: 'कुटुंब', familyEvents: 'कौटुंबिक कार्यक्रम', pooja: 'पूजा', songs: 'भजने', astro: 'कुंडली', ask: 'विचारा', settings: 'सेटिंग्ज',
  askPlaceholder: 'तिथी, पंचांग, कौटुंबिक कार्यक्रम किंवा मुहूर्ताबद्दल विचारा…',
  todayPanchang: 'आजचे पंचांग', thithi: 'तिथी', nakshatra: 'नक्षत्र', yoga: 'योग', karana: 'करण',
  paksha: 'पक्ष', month: 'मास', year: 'संवत्सर', sunrise: 'सूर्योदय', sunset: 'सूर्यास्त', until: 'पर्यंत',
  rahu: 'राहू काळ', yama: 'यमगंड', gulika: 'गुलिक काळ', abhijit: 'अभिजित मुहूर्त',
  timings: 'वेळा', upcomingFamily: 'येणारे कौटुंबिक कार्यक्रम', upcomingObs: 'सण आणि व्रते',
  guidance: 'आजचे पारंपरिक मार्गदर्शन', addEvent: 'कार्यक्रम जोडा', noEvents: 'अजून कोणतेही कार्यक्रम नाहीत.',
  save: 'जतन करा', cancel: 'रद्द करा', edit: 'बदला', delete: 'काढा', back: 'मागे', next: 'पुढे', skip: 'वगळा',
  signIn: 'साइन इन', account: 'खाते', sample: 'नमुना', today: 'आज', tomorrow: 'उद्या', inDays: '{n} दिवसांत',
};

// Bengali, Gujarati, Punjabi, Rajasthani (Marwari), Odia and Bhojpuri: first pass, to be checked by native speakers.
const BN: Partial<Record<Key, string>> = {
  home: 'হোম', calendar: 'ক্যালেন্ডার', events: 'পরিবার', familyEvents: 'পারিবারিক অনুষ্ঠান', pooja: 'পূজা', songs: 'গান', astro: 'কোষ্ঠী', ask: 'জিজ্ঞাসা', settings: 'সেটিংস',
  askPlaceholder: 'তিথি, পঞ্জিকা, পারিবারিক অনুষ্ঠান বা শুভ সময় নিয়ে জিজ্ঞাসা করুন…',
  todayPanchang: 'আজকের পঞ্জিকা', thithi: 'তিথি', nakshatra: 'নক্ষত্র', yoga: 'যোগ', karana: 'করণ',
  paksha: 'পক্ষ', month: 'মাস', year: 'বছর', sunrise: 'সূর্যোদয়', sunset: 'সূর্যাস্ত', until: 'পর্যন্ত',
  rahu: 'রাহুকাল', yama: 'যমগণ্ড', gulika: 'গুলিক কাল', abhijit: 'অভিজিৎ মুহূর্ত',
  timings: 'সময়', upcomingFamily: 'আসন্ন পারিবারিক অনুষ্ঠান', upcomingObs: 'উৎসব ও ব্রত',
  guidance: 'আজকের প্রথাগত নির্দেশ', addEvent: 'অনুষ্ঠান যোগ করুন', noEvents: 'এখনও কোনো অনুষ্ঠান নেই।',
  save: 'সংরক্ষণ', cancel: 'বাতিল', edit: 'সম্পাদনা', delete: 'মুছুন', back: 'পিছনে', next: 'পরবর্তী', skip: 'এড়িয়ে যান',
  signIn: 'সাইন ইন', account: 'অ্যাকাউন্ট', sample: 'নমুনা', today: 'আজ', tomorrow: 'আগামীকাল', inDays: '{n} দিনে',
};
const GU: Partial<Record<Key, string>> = {
  home: 'હોમ', calendar: 'કેલેન્ડર', events: 'પરિવાર', familyEvents: 'પારિવારિક પ્રસંગો', pooja: 'પૂજા', songs: 'ભજન', astro: 'કુંડળી', ask: 'પૂછો', settings: 'સેટિંગ્સ',
  askPlaceholder: 'તિથિ, પંચાંગ, પારિવારિક પ્રસંગો કે શુભ મુહૂર્ત વિશે પૂછો…',
  todayPanchang: 'આજનું પંચાંગ', thithi: 'તિથિ', nakshatra: 'નક્ષત્ર', yoga: 'યોગ', karana: 'કરણ',
  paksha: 'પક્ષ', month: 'માસ', year: 'વર્ષ', sunrise: 'સૂર્યોદય', sunset: 'સૂર્યાસ્ત', until: 'સુધી',
  rahu: 'રાહુકાળ', yama: 'યમગંડ', gulika: 'ગુલિક કાળ', abhijit: 'અભિજિત મુહૂર્ત',
  timings: 'સમય', upcomingFamily: 'આવનારા પારિવારિક પ્રસંગો', upcomingObs: 'તહેવારો અને વ્રત',
  guidance: 'આજનું પરંપરાગત માર્ગદર્શન', addEvent: 'પ્રસંગ ઉમેરો', noEvents: 'હજી કોઈ પ્રસંગ નથી.',
  save: 'સાચવો', cancel: 'રદ કરો', edit: 'ફેરફાર', delete: 'કાઢી નાખો', back: 'પાછળ', next: 'આગળ', skip: 'છોડો',
  signIn: 'સાઇન ઇન', account: 'ખાતું', sample: 'નમૂનો', today: 'આજે', tomorrow: 'આવતીકાલે', inDays: '{n} દિવસમાં',
};
const PA: Partial<Record<Key, string>> = {
  home: 'ਹੋਮ', calendar: 'ਕੈਲੰਡਰ', events: 'ਪਰਿਵਾਰ', familyEvents: 'ਪਰਿਵਾਰਕ ਸਮਾਗਮ', pooja: 'ਪੂਜਾ', songs: 'ਭਜਨ', astro: 'ਕੁੰਡਲੀ', ask: 'ਪੁੱਛੋ', settings: 'ਸੈਟਿੰਗਾਂ',
  askPlaceholder: 'ਤਿਥੀ, ਪੰਚਾਂਗ, ਪਰਿਵਾਰਕ ਸਮਾਗਮਾਂ ਜਾਂ ਸ਼ੁਭ ਮਹੂਰਤ ਬਾਰੇ ਪੁੱਛੋ…',
  todayPanchang: 'ਅੱਜ ਦਾ ਪੰਚਾਂਗ', thithi: 'ਤਿਥੀ', nakshatra: 'ਨਛੱਤਰ', yoga: 'ਯੋਗ', karana: 'ਕਰਣ',
  paksha: 'ਪੱਖ', month: 'ਮਹੀਨਾ', year: 'ਸਾਲ', sunrise: 'ਸੂਰਜ ਚੜ੍ਹਨਾ', sunset: 'ਸੂਰਜ ਡੁੱਬਣਾ', until: 'ਤੱਕ',
  rahu: 'ਰਾਹੂ ਕਾਲ', yama: 'ਯਮਗੰਡ', gulika: 'ਗੁਲਿਕ ਕਾਲ', abhijit: 'ਅਭਿਜੀਤ ਮਹੂਰਤ',
  timings: 'ਸਮਾਂ', upcomingFamily: 'ਆਉਣ ਵਾਲੇ ਪਰਿਵਾਰਕ ਸਮਾਗਮ', upcomingObs: 'ਤਿਉਹਾਰ ਅਤੇ ਵਰਤ',
  guidance: 'ਅੱਜ ਦੀ ਰਵਾਇਤੀ ਸੇਧ', addEvent: 'ਸਮਾਗਮ ਜੋੜੋ', noEvents: 'ਅਜੇ ਕੋਈ ਸਮਾਗਮ ਨਹੀਂ।',
  save: 'ਸੰਭਾਲੋ', cancel: 'ਰੱਦ ਕਰੋ', edit: 'ਬਦਲੋ', delete: 'ਮਿਟਾਓ', back: 'ਪਿੱਛੇ', next: 'ਅੱਗੇ', skip: 'ਛੱਡੋ',
  signIn: 'ਸਾਈਨ ਇਨ', account: 'ਖਾਤਾ', sample: 'ਨਮੂਨਾ', today: 'ਅੱਜ', tomorrow: 'ਕੱਲ੍ਹ', inDays: '{n} ਦਿਨਾਂ ਵਿੱਚ',
};
const RAJ: Partial<Record<Key, string>> = {
  home: 'होम', calendar: 'कैलेंडर', events: 'परिवार', familyEvents: 'परिवार रा कारज', pooja: 'पूजा', songs: 'भजन', astro: 'कुंडली', ask: 'पूछो', settings: 'सेटिंग्स',
  askPlaceholder: 'तिथि, पंचांग, परिवार रा कारज का मुहूरत बाबत पूछो…',
  todayPanchang: 'आज रो पंचांग', thithi: 'तिथि', nakshatra: 'नखतर', yoga: 'जोग', karana: 'करण',
  paksha: 'पख', month: 'महीनो', year: 'बरस', sunrise: 'सूरज उगणो', sunset: 'सूरज आथणो', until: 'तांई',
  rahu: 'राहु काळ', yama: 'जमगंड', gulika: 'गुलिक काळ', abhijit: 'अभिजित मुहूरत',
  timings: 'बखत', upcomingFamily: 'आवण वाळा परिवार रा कारज', upcomingObs: 'तिंवार अर बरत',
  guidance: 'आज री परंपरा री सीख', addEvent: 'कारज जोड़ो', noEvents: 'हाल कोई कारज कोनी।',
  save: 'सेव करो', cancel: 'रद्द करो', edit: 'बदळो', delete: 'हटाओ', back: 'पाछा', next: 'आगे', skip: 'छोड़ो',
  signIn: 'साइन इन', account: 'खातो', sample: 'नमूनो', today: 'आज', tomorrow: 'काल', inDays: '{n} दिनां में',
};
const OR: Partial<Record<Key, string>> = {
  home: 'ହୋମ', calendar: 'କ୍ୟାଲେଣ୍ଡର', events: 'ପରିବାର', familyEvents: 'ପାରିବାରିକ କାର୍ଯ୍ୟକ୍ରମ', pooja: 'ପୂଜା', songs: 'ଭଜନ', astro: 'କୋଷ୍ଠୀ', ask: 'ପଚାରନ୍ତୁ', settings: 'ସେଟିଂସ',
  askPlaceholder: 'ତିଥି, ପାଞ୍ଜି, ପାରିବାରିକ କାର୍ଯ୍ୟକ୍ରମ ବା ଶୁଭ ମୁହୂର୍ତ୍ତ ବିଷୟରେ ପଚାରନ୍ତୁ…',
  todayPanchang: 'ଆଜିର ପାଞ୍ଜି', thithi: 'ତିଥି', nakshatra: 'ନକ୍ଷତ୍ର', yoga: 'ଯୋଗ', karana: 'କରଣ',
  paksha: 'ପକ୍ଷ', month: 'ମାସ', year: 'ବର୍ଷ', sunrise: 'ସୂର୍ଯ୍ୟୋଦୟ', sunset: 'ସୂର୍ଯ୍ୟାସ୍ତ', until: 'ପର୍ଯ୍ୟନ୍ତ',
  rahu: 'ରାହୁ କାଳ', yama: 'ଯମଗଣ୍ଡ', gulika: 'ଗୁଳିକ କାଳ', abhijit: 'ଅଭିଜିତ ମୁହୂର୍ତ୍ତ',
  timings: 'ସମୟ', upcomingFamily: 'ଆଗାମୀ ପାରିବାରିକ କାର୍ଯ୍ୟକ୍ରମ', upcomingObs: 'ପର୍ବପର୍ବାଣି ଓ ବ୍ରତ',
  guidance: 'ଆଜିର ପାରମ୍ପରିକ ମାର୍ଗଦର୍ଶନ', addEvent: 'କାର୍ଯ୍ୟକ୍ରମ ଯୋଡ଼ନ୍ତୁ', noEvents: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି କାର୍ଯ୍ୟକ୍ରମ ନାହିଁ।',
  save: 'ସେଭ କରନ୍ତୁ', cancel: 'ବାତିଲ', edit: 'ବଦଳାନ୍ତୁ', delete: 'ବିଲୋପ କରନ୍ତୁ', back: 'ପଛକୁ', next: 'ପରବର୍ତ୍ତୀ', skip: 'ଛାଡ଼ନ୍ତୁ',
  signIn: 'ସାଇନ ଇନ', account: 'ଆକାଉଣ୍ଟ', sample: 'ନମୁନା', today: 'ଆଜି', tomorrow: 'କାଲି', inDays: '{n} ଦିନରେ',
};
const BHO: Partial<Record<Key, string>> = {
  home: 'होम', calendar: 'कैलेंडर', events: 'परिवार', familyEvents: 'परिवार के परोजन', pooja: 'पूजा', songs: 'भजन', astro: 'कुंडली', ask: 'पूछीं', settings: 'सेटिंग',
  askPlaceholder: 'तिथि, पतरा, परिवार के परोजन भा सुभ मुहूरत के बारे में पूछीं…',
  todayPanchang: 'आज के पतरा', thithi: 'तिथि', nakshatra: 'नछत्तर', yoga: 'जोग', karana: 'करन',
  paksha: 'पाख', month: 'महीना', year: 'साल', sunrise: 'सूरुज उगल', sunset: 'सूरुज डूबल', until: 'ले',
  rahu: 'राहु काल', yama: 'जमगंड', gulika: 'गुलिक काल', abhijit: 'अभिजित मुहूरत',
  timings: 'समय', upcomingFamily: 'आवे वाला परिवार के परोजन', upcomingObs: 'तेवहार आ बरत',
  guidance: 'आज के परंपरा वाला सलाह', addEvent: 'परोजन जोड़ीं', noEvents: 'अबहीं ले कवनो परोजन नइखे।',
  save: 'सहेजीं', cancel: 'रद्द करीं', edit: 'बदलीं', delete: 'हटाईं', back: 'पीछे', next: 'आगे', skip: 'छोड़ीं',
  signIn: 'साइन इन', account: 'खाता', sample: 'नमूना', today: 'आज', tomorrow: 'काल्ह', inDays: '{n} दिन में',
};

const TABLES: Partial<Record<Lang, Partial<Record<Key, string>>>> = { te: TE, kn: KN, ta: TA, ml: ML, hi: HI, mr: MR, bn: BN, gu: GU, pa: PA, raj: RAJ, or: OR, bho: BHO };

/** The app's languages, each named in its own script. */
export const LANGS: Array<{ id: Lang; name: string }> = [
  { id: 'en', name: 'English' }, { id: 'te', name: 'తెలుగు (Telugu)' }, { id: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { id: 'ta', name: 'தமிழ் (Tamil)' }, { id: 'ml', name: 'മലയാളം (Malayalam)' }, { id: 'hi', name: 'हिन्दी (Hindi)' },
  { id: 'mr', name: 'मराठी (Marathi)' }, { id: 'gu', name: 'ગુજરાતી (Gujarati)' }, { id: 'bn', name: 'বাংলা (Bengali)' },
  { id: 'or', name: 'ଓଡ଼ିଆ (Odia)' }, { id: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' }, { id: 'raj', name: 'राजस्थानी / मारवाड़ी (Rajasthani)' },
  { id: 'bho', name: 'भोजपुरी (Bhojpuri)' },
];

export type Vars = Record<string, string | number>;
export const fill = (s: string, vars?: Vars) => (vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), s) : s);

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  return fill(TABLES[lang]?.[key] ?? EN[key], vars);
}

/** "until 9:32 PM" in English; the Indian languages put the word after the time. */
export const untilTime = (lang: Lang, time: string) => (lang === 'en' ? `${translate(lang, 'until')} ${time}` : `${time} ${translate(lang, 'until')}`);

/** Locale for dates and times (month names, AM/PM) in each language. */
/** Whether this browser writes month names for `locale` in the script `letters` matches (some builds lack Punjabi or Odia data). */
function writes(locale: string, letters: RegExp): boolean {
  try { return letters.test(new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 15)))); } catch { return false; }
}

export const LOCALE: Record<Lang, string> = {
  en: 'en-IN', te: 'te-IN', kn: 'kn-IN', ta: 'ta-IN', ml: 'ml-IN', hi: 'hi-IN', mr: 'mr-IN',
  // Browsers have no Rajasthani or Bhojpuri date formats; Hindi month and day names are what those homes read.
  // Where a browser has no Punjabi or Odia dates, Punjabi homes read Hindi ones and Odia homes English ones.
  bn: 'bn-IN', gu: 'gu-IN', raj: 'hi-IN', bho: 'hi-IN',
  pa: writes('pa-IN', /[\u0A00-\u0A7F]/) ? 'pa-IN' : 'hi-IN',
  or: writes('or-IN', /[\u0B00-\u0B7F]/) ? 'or-IN' : 'en-IN',
};

/**
 * A screen's own text in every language. Each language must have every key, so a missing
 * translation is a type error rather than a silent fall-back to English.
 */
export type ScreenText<K extends string> = Record<Lang, Record<K, string>>;

/** `x(key)` reads the screen's text in the chosen language; `t` and `lang` as in useT. */
export function useText<K extends string>(table: ScreenText<K>) {
  const lang = useStore((s) => s.settings.lang);
  return {
    lang,
    x: (key: K, vars?: Vars) => fill(table[lang][key], vars),
    t: (key: Key, vars?: Vars) => translate(lang, key, vars),
  };
}

/** BCP 47 tag of the voice that reads stotrams in the chosen language's script. */
export const VOICE_LANG: Record<Lang, string> = {
  en: 'te-IN', te: 'te-IN', kn: 'kn-IN', ta: 'ta-IN', ml: 'ml-IN', hi: 'hi-IN', mr: 'mr-IN',
  // Punjabi, Rajasthani and Bhojpuri show stotrams in Devanagari, read by the Hindi voice.
  bn: 'bn-IN', gu: 'gu-IN', pa: 'hi-IN', raj: 'hi-IN', or: 'or-IN', bho: 'hi-IN',
};

/** Sanskrit texts (stotrams, mantras, namavalis) shown in the chosen language's script. */
export function useScript() {
  const lang = useStore((s) => s.settings.lang);
  const script = SCRIPT_OF[lang];
  const sa = (text: string) => fromTelugu(text, script);
  // Titles carry the Telugu ending -ము (స్తోత్రము); other languages write the Sanskrit -m.
  // Titles in Tamil are written plainly, as book covers print them, without the ²³⁴ chanting marks.
  const saTitle = (text: string) => (script === 'telugu' ? text : sa(text.replace(/ము(?=\s|$)/g, 'మ్')).replace(/[²³⁴]/g, ''));
  return { lang, script, sa, saTitle };
}

export function useT() {
  const lang = useStore((s) => s.settings.lang);
  return { lang, t: (key: Key, vars?: Vars) => translate(lang, key, vars) };
}
