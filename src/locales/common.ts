// Labels shared by several screens: event types, relationships, observance rules and the date
// pickers' words. First pass for kn/ta/ml/hi/mr, to be checked by native speakers.
import type { EventCategory } from '../data/types';
import type { ObservanceRule } from '../engine/recurrence';
import type { Lang } from '../engine/names';

export const CATEGORY: Record<Lang, Record<EventCategory, string>> = {
  en: {
    birthday: 'Birthday', marriage: 'Marriage anniversary', death: 'Death anniversary', shraddha: 'Ancestor Shraddha',
    engagement: 'Engagement anniversary', naming: 'Naming ceremony anniversary', housewarming: 'Housewarming anniversary',
    religious: 'Religious ceremony', custom: 'Custom event',
  },
  te: {
    birthday: 'పుట్టినరోజు', marriage: 'వివాహ వార్షికోత్సవం', death: 'వర్ధంతి', shraddha: 'పితృ శ్రాద్ధం',
    engagement: 'నిశ్చితార్థ వార్షికోత్సవం', naming: 'నామకరణ వార్షికోత్సవం', housewarming: 'గృహప్రవేశ వార్షికోత్సవం',
    religious: 'ధార్మిక కార్యక్రమం', custom: 'ఇతర కార్యక్రమం',
  },
  kn: {
    birthday: 'ಹುಟ್ಟುಹಬ್ಬ', marriage: 'ವಿವಾಹ ವಾರ್ಷಿಕೋತ್ಸವ', death: 'ಪುಣ್ಯತಿಥಿ', shraddha: 'ಪಿತೃ ಶ್ರಾದ್ಧ',
    engagement: 'ನಿಶ್ಚಿತಾರ್ಥ ವಾರ್ಷಿಕೋತ್ಸವ', naming: 'ನಾಮಕರಣ ವಾರ್ಷಿಕೋತ್ಸವ', housewarming: 'ಗೃಹಪ್ರವೇಶ ವಾರ್ಷಿಕೋತ್ಸವ',
    religious: 'ಧಾರ್ಮಿಕ ಕಾರ್ಯಕ್ರಮ', custom: 'ಇತರ ಕಾರ್ಯಕ್ರಮ',
  },
  ta: {
    birthday: 'பிறந்தநாள்', marriage: 'திருமண நாள்', death: 'நினைவு நாள்', shraddha: 'முன்னோர் திவசம்',
    engagement: 'நிச்சயதார்த்த நாள்', naming: 'பெயர்சூட்டு விழா நாள்', housewarming: 'புதுமனை புகுவிழா நாள்',
    religious: 'சமய நிகழ்வு', custom: 'பிற நிகழ்வு',
  },
  ml: {
    birthday: 'ജന്മദിനം', marriage: 'വിവാഹ വാർഷികം', death: 'ചരമവാർഷികം', shraddha: 'പിതൃ ശ്രാദ്ധം',
    engagement: 'വിവാഹനിശ്ചയ വാർഷികം', naming: 'നാമകരണ വാർഷികം', housewarming: 'ഗൃഹപ്രവേശ വാർഷികം',
    religious: 'മതപരമായ ചടങ്ങ്', custom: 'മറ്റ് പരിപാടി',
  },
  hi: {
    birthday: 'जन्मदिन', marriage: 'विवाह वर्षगाँठ', death: 'पुण्यतिथि', shraddha: 'पितृ श्राद्ध',
    engagement: 'सगाई की वर्षगाँठ', naming: 'नामकरण की वर्षगाँठ', housewarming: 'गृहप्रवेश की वर्षगाँठ',
    religious: 'धार्मिक अनुष्ठान', custom: 'अन्य कार्यक्रम',
  },
  mr: {
    birthday: 'वाढदिवस', marriage: 'लग्नाचा वाढदिवस', death: 'पुण्यतिथी', shraddha: 'पितृ श्राद्ध',
    engagement: 'साखरपुड्याचा वाढदिवस', naming: 'नामकरणाचा वाढदिवस', housewarming: 'गृहप्रवेशाचा वाढदिवस',
    religious: 'धार्मिक विधी', custom: 'इतर कार्यक्रम',
  },
  bn: {
    birthday: 'জন্মদিন',
    marriage: 'বিবাহবার্ষিকী',
    death: 'মৃত্যুবার্ষিকী',
    shraddha: 'পিতৃশ্রাদ্ধ',
    engagement: 'বাগদান বার্ষিকী',
    naming: 'নামকরণ বার্ষিকী',
    housewarming: 'গৃহপ্রবেশ বার্ষিকী',
    religious: 'ধর্মীয় অনুষ্ঠান',
    custom: 'অন্যান্য অনুষ্ঠান',
  },
  gu: {
    birthday: 'જન્મદિવસ',
    marriage: 'લગ્નતિથિ',
    death: 'પુણ્યતિથિ',
    shraddha: 'પિતૃ શ્રાદ્ધ',
    engagement: 'સગાઈની વર્ષગાંઠ',
    naming: 'નામકરણની વર્ષગાંઠ',
    housewarming: 'ગૃહપ્રવેશની વર્ષગાંઠ',
    religious: 'ધાર્મિક પ્રસંગ',
    custom: 'અન્ય પ્રસંગ',
  },
  pa: {
    birthday: 'ਜਨਮਦਿਨ',
    marriage: 'ਵਿਆਹ ਦੀ ਵਰ੍ਹੇਗੰਢ',
    death: 'ਬਰਸੀ',
    shraddha: 'ਪਿੱਤਰ ਸ਼ਰਾਧ',
    engagement: 'ਮੰਗਣੀ ਦੀ ਵਰ੍ਹੇਗੰਢ',
    naming: 'ਨਾਮਕਰਨ ਦੀ ਵਰ੍ਹੇਗੰਢ',
    housewarming: 'ਗ੍ਰਹਿ ਪ੍ਰਵੇਸ਼ ਦੀ ਵਰ੍ਹੇਗੰਢ',
    religious: 'ਧਾਰਮਿਕ ਸਮਾਗਮ',
    custom: 'ਹੋਰ ਸਮਾਗਮ',
  },
  raj: {
    birthday: 'जनमदिन',
    marriage: 'ब्याव री बरसगांठ',
    death: 'बरसी',
    shraddha: 'पितरां रो सराध',
    engagement: 'सगाई री बरसगांठ',
    naming: 'नामकरण री बरसगांठ',
    housewarming: 'गृहप्रवेस री बरसगांठ',
    religious: 'धरम रो कारज',
    custom: 'दूजो कारज',
  },
  or: {
    birthday: 'ଜନ୍ମଦିନ',
    marriage: 'ବିବାହ ବାର୍ଷିକୀ',
    death: 'ଶ୍ରାଦ୍ଧ ବାର୍ଷିକୀ',
    shraddha: 'ପିତୃ ଶ୍ରାଦ୍ଧ',
    engagement: 'ନିର୍ବନ୍ଧ ବାର୍ଷିକୀ',
    naming: 'ନାମକରଣ ବାର୍ଷିକୀ',
    housewarming: 'ଗୃହପ୍ରବେଶ ବାର୍ଷିକୀ',
    religious: 'ଧାର୍ମିକ କାର୍ଯ୍ୟ',
    custom: 'ଅନ୍ୟ କାର୍ଯ୍ୟକ୍ରମ',
  },
  bho: {
    birthday: 'जनमदिन',
    marriage: 'बियाह के बरसी',
    death: 'बरखी',
    shraddha: 'पितर के सराध',
    engagement: 'छेंका / सगाई के बरसी',
    naming: 'नामकरन के बरसी',
    housewarming: 'गृहप्रवेस के बरसी',
    religious: 'धरम के काम',
    custom: 'दोसर परोजन',
  },
};

/** Stored on the event in English (the key); shown in the chosen language. */
export const RELATIONS = ['Self', 'Father', 'Mother', 'Grandfather', 'Grandmother', 'Wife', 'Husband', 'Son', 'Daughter', 'Brother', 'Sister', 'Father-in-law', 'Mother-in-law', 'Uncle', 'Aunt', 'Friend', 'Other'] as const;
type Relation = (typeof RELATIONS)[number];
const rel = (...names: string[]) => Object.fromEntries(RELATIONS.map((r, i) => [r, names[i]])) as Record<Relation, string>;

export const RELATION: Record<Lang, Record<Relation, string>> = {
  en: rel(...RELATIONS),
  te: rel('నేను', 'నాన్న', 'అమ్మ', 'తాతయ్య', 'నానమ్మ / అమ్మమ్మ', 'భార్య', 'భర్త', 'కొడుకు', 'కూతురు', 'అన్న / తమ్ముడు', 'అక్క / చెల్లి', 'మామగారు', 'అత్తగారు', 'బాబాయి / మామయ్య', 'పిన్ని / అత్తయ్య', 'స్నేహితులు', 'ఇతరులు'),
  kn: rel('ನಾನು', 'ತಂದೆ', 'ತಾಯಿ', 'ಅಜ್ಜ', 'ಅಜ್ಜಿ', 'ಹೆಂಡತಿ', 'ಗಂಡ', 'ಮಗ', 'ಮಗಳು', 'ಸಹೋದರ', 'ಸಹೋದರಿ', 'ಮಾವ', 'ಅತ್ತೆ', 'ಚಿಕ್ಕಪ್ಪ / ಮಾವ', 'ಚಿಕ್ಕಮ್ಮ / ಅತ್ತೆ', 'ಸ್ನೇಹಿತರು', 'ಇತರರು'),
  ta: rel('நான்', 'அப்பா', 'அம்மா', 'தாத்தா', 'பாட்டி', 'மனைவி', 'கணவர்', 'மகன்', 'மகள்', 'சகோதரர்', 'சகோதரி', 'மாமனார்', 'மாமியார்', 'சித்தப்பா / மாமா', 'சித்தி / அத்தை', 'நண்பர்', 'மற்றவர்'),
  ml: rel('ഞാൻ', 'അച്ഛൻ', 'അമ്മ', 'മുത്തച്ഛൻ', 'മുത്തശ്ശി', 'ഭാര്യ', 'ഭർത്താവ്', 'മകൻ', 'മകൾ', 'സഹോദരൻ', 'സഹോദരി', 'അമ്മായിയപ്പൻ', 'അമ്മായിയമ്മ', 'ചെറിയച്ഛൻ / അമ്മാവൻ', 'ചെറിയമ്മ / അമ്മായി', 'സുഹൃത്ത്', 'മറ്റുള്ളവർ'),
  hi: rel('स्वयं', 'पिता', 'माता', 'दादा / नाना', 'दादी / नानी', 'पत्नी', 'पति', 'पुत्र', 'पुत्री', 'भाई', 'बहन', 'ससुर', 'सास', 'चाचा / मामा', 'चाची / मौसी', 'मित्र', 'अन्य'),
  mr: rel('स्वतः', 'वडील', 'आई', 'आजोबा', 'आजी', 'पत्नी', 'पती', 'मुलगा', 'मुलगी', 'भाऊ', 'बहीण', 'सासरे', 'सासू', 'काका / मामा', 'काकू / मावशी', 'मित्र', 'इतर'),
  bn: rel('আমি', 'বাবা', 'মা', 'দাদু', 'ঠাকুমা / দিদিমা', 'স্ত্রী', 'স্বামী', 'ছেলে', 'মেয়ে', 'ভাই', 'বোন', 'শ্বশুর', 'শাশুড়ি', 'কাকা / মামা', 'কাকিমা / মাসি', 'বন্ধু', 'অন্যান্য'),
  gu: rel('હું', 'પિતા', 'માતા', 'દાદા / નાના', 'દાદી / નાની', 'પત્ની', 'પતિ', 'દીકરો', 'દીકરી', 'ભાઈ', 'બહેન', 'સસરા', 'સાસુ', 'કાકા / મામા', 'કાકી / માસી', 'મિત્ર', 'અન્ય'),
  pa: rel('ਮੈਂ', 'ਪਿਤਾ', 'ਮਾਤਾ', 'ਦਾਦਾ / ਨਾਨਾ', 'ਦਾਦੀ / ਨਾਨੀ', 'ਪਤਨੀ', 'ਪਤੀ', 'ਪੁੱਤਰ', 'ਧੀ', 'ਭਰਾ', 'ਭੈਣ', 'ਸਹੁਰਾ', 'ਸੱਸ', 'ਚਾਚਾ / ਮਾਮਾ', 'ਚਾਚੀ / ਮਾਸੀ', 'ਦੋਸਤ', 'ਹੋਰ'),
  raj: rel('म्हैं', 'बापूजी', 'माऊ', 'दादोसा / नानोसा', 'दादीसा / नानीसा', 'लुगाई', 'धणी', 'बेटो', 'बेटी', 'भाई', 'बैन', 'सुसरोजी', 'सासूजी', 'काकोसा / मामोसा', 'काकीसा / मासीसा', 'भायलो', 'दूजा'),
  or: rel('ମୁଁ', 'ବାପା', 'ମା', 'ଜେଜେବାପା / ଅଜା', 'ଜେଜେମା / ଆଈ', 'ସ୍ତ୍ରୀ', 'ସ୍ୱାମୀ', 'ପୁଅ', 'ଝିଅ', 'ଭାଇ', 'ଭଉଣୀ', 'ଶ୍ୱଶୁର', 'ଶାଶୁ', 'ଦାଦା / ମାମୁଁ', 'ଖୁଡ଼ୀ / ମାଉସୀ', 'ସାଙ୍ଗ', 'ଅନ୍ୟ'),
  bho: rel('हम', 'बाबूजी', 'माई', 'बाबा / नाना', 'आजी / नानी', 'मेहरारू', 'मरद', 'बेटा', 'बेटी', 'भाई', 'बहिन', 'ससुर', 'सास', 'चाचा / मामा', 'चाची / मौसी', 'दोस्त', 'दोसर'),
};

/** A relationship in the chosen language; anything typed by hand is shown as it is. */
export const relationLabel = (r: string, lang: Lang) => RELATION[lang][r as Relation] ?? r;

export const RULE: Record<Lang, Record<ObservanceRule, string>> = {
  en: {
    sunrise: 'at sunrise (Udaya thithi)', aparahna: 'during Aparahna (afternoon)', madhyahna: 'at midday (Madhyahna)',
    pradosha: 'during Pradosha (after sunset)', nishita: 'at Nishita (around midnight)', moonrise: 'at moonrise',
  },
  te: {
    sunrise: 'సూర్యోదయానికి (ఉదయ తిథి)', aparahna: 'అపరాహ్ణ కాలంలో (మధ్యాహ్నం తర్వాత)', madhyahna: 'మధ్యాహ్న కాలంలో',
    pradosha: 'ప్రదోష కాలంలో (సూర్యాస్తమయం తర్వాత)', nishita: 'నిశీథ కాలంలో (అర్ధరాత్రి)', moonrise: 'చంద్రోదయానికి',
  },
  kn: {
    sunrise: 'ಸೂರ್ಯೋದಯದಲ್ಲಿ (ಉದಯ ತಿಥಿ)', aparahna: 'ಅಪರಾಹ್ಣ ಕಾಲದಲ್ಲಿ (ಮಧ್ಯಾಹ್ನದ ನಂತರ)', madhyahna: 'ಮಧ್ಯಾಹ್ನ ಕಾಲದಲ್ಲಿ',
    pradosha: 'ಪ್ರದೋಷ ಕಾಲದಲ್ಲಿ (ಸೂರ್ಯಾಸ್ತದ ನಂತರ)', nishita: 'ನಿಶೀಥ ಕಾಲದಲ್ಲಿ (ಮಧ್ಯರಾತ್ರಿ)', moonrise: 'ಚಂದ್ರೋದಯದಲ್ಲಿ',
  },
  ta: {
    sunrise: 'சூரிய உதயத்தில் (உதய திதி)', aparahna: 'அபராஹ்ண காலத்தில் (பிற்பகல்)', madhyahna: 'மத்தியான காலத்தில் (நண்பகல்)',
    pradosha: 'பிரதோஷ காலத்தில் (சூரிய அஸ்தமனத்திற்குப் பின்)', nishita: 'நிசீத காலத்தில் (நள்ளிரவு)', moonrise: 'சந்திர உதயத்தில்',
  },
  ml: {
    sunrise: 'സൂര്യോദയത്തിൽ (ഉദയ തിഥി)', aparahna: 'അപരാഹ്ണ സമയത്ത് (ഉച്ചകഴിഞ്ഞ്)', madhyahna: 'മധ്യാഹ്ന സമയത്ത് (ഉച്ചയ്ക്ക്)',
    pradosha: 'പ്രദോഷ സമയത്ത് (സൂര്യാസ്തമയത്തിനു ശേഷം)', nishita: 'നിശീഥ സമയത്ത് (അർധരാത്രി)', moonrise: 'ചന്ദ്രോദയത്തിൽ',
  },
  hi: {
    sunrise: 'सूर्योदय के समय (उदया तिथि)', aparahna: 'अपराह्न काल में (दोपहर बाद)', madhyahna: 'मध्याह्न काल में',
    pradosha: 'प्रदोष काल में (सूर्यास्त के बाद)', nishita: 'निशीथ काल में (मध्यरात्रि)', moonrise: 'चंद्रोदय के समय',
  },
  mr: {
    sunrise: 'सूर्योदयाच्या वेळी (उदय तिथी)', aparahna: 'अपराह्न काळात (दुपारनंतर)', madhyahna: 'मध्याह्न काळात',
    pradosha: 'प्रदोष काळात (सूर्यास्तानंतर)', nishita: 'निशीथ काळात (मध्यरात्री)', moonrise: 'चंद्रोदयाच्या वेळी',
  },
  bn: {
    sunrise: 'সূর্যোদয়ে (উদয় তিথি)',
    aparahna: 'অপরাহ্ণে (দুপুরের পরে)',
    madhyahna: 'মধ্যাহ্নে',
    pradosha: 'প্রদোষে (সূর্যাস্তের পরে)',
    nishita: 'নিশীথে (মধ্যরাত্রির কাছাকাছি)',
    moonrise: 'চন্দ্রোদয়ে',
  },
  gu: {
    sunrise: 'સૂર્યોદયે (ઉદય તિથિ)',
    aparahna: 'અપરાહ્ણ કાળે (બપોર પછી)',
    madhyahna: 'મધ્યાહ્ને',
    pradosha: 'પ્રદોષ કાળે (સૂર્યાસ્ત પછી)',
    nishita: 'નિશીથ કાળે (મધ્યરાત્રિએ)',
    moonrise: 'ચંદ્રોદયે',
  },
  pa: {
    sunrise: 'ਸੂਰਜ ਚੜ੍ਹਨ ਵੇਲੇ (ਉਦਯ ਤਿਥੀ)',
    aparahna: 'ਅਪਰਾਹਨ ਵਿੱਚ (ਦੁਪਹਿਰ ਤੋਂ ਬਾਅਦ)',
    madhyahna: 'ਦੁਪਹਿਰ ਵੇਲੇ (ਮੱਧਾਹਨ)',
    pradosha: 'ਪ੍ਰਦੋਸ਼ ਵਿੱਚ (ਸੂਰਜ ਡੁੱਬਣ ਤੋਂ ਬਾਅਦ)',
    nishita: 'ਨਿਸ਼ੀਥ ਵੇਲੇ (ਅੱਧੀ ਰਾਤ ਦੇ ਨੇੜੇ)',
    moonrise: 'ਚੰਦ ਚੜ੍ਹਨ ਵੇਲੇ',
  },
  raj: {
    sunrise: 'सूरज उगतां (उदय तिथि)',
    aparahna: 'अपराह्ण में (दोपारां पछै)',
    madhyahna: 'दोपारां (मध्याह्न)',
    pradosha: 'प्रदोस में (सूरज आथ्यां पछै)',
    nishita: 'निसीथ में (आधी रात रै नैड़ै)',
    moonrise: 'चांद उगतां',
  },
  or: {
    sunrise: 'ସୂର୍ଯ୍ୟୋଦୟରେ (ଉଦୟ ତିଥି)',
    aparahna: 'ଅପରାହ୍ଣରେ (ଦ୍ୱିପ୍ରହର ପରେ)',
    madhyahna: 'ମଧ୍ୟାହ୍ନରେ',
    pradosha: 'ପ୍ରଦୋଷରେ (ସୂର୍ଯ୍ୟାସ୍ତ ପରେ)',
    nishita: 'ନିଶୀଥରେ (ମଧ୍ୟରାତ୍ରି ନିକଟରେ)',
    moonrise: 'ଚନ୍ଦ୍ରୋଦୟରେ',
  },
  bho: {
    sunrise: 'सूरुज उगते (उदय तिथि)',
    aparahna: 'अपराह्न में (दुपहरिया के बाद)',
    madhyahna: 'दुपहरिया में (मध्याह्न)',
    pradosha: 'परदोस में (सूरुज डूबला के बाद)',
    nishita: 'निसीथ में (आधा रात के लगे)',
    moonrise: 'चान उगते',
  },
};

/** The Day / Month / Year dropdowns' placeholders. */
export const DATE_WORDS: Record<Lang, { day: string; month: string; year: string }> = {
  en: { day: 'Day', month: 'Month', year: 'Year' },
  te: { day: 'రోజు', month: 'నెల', year: 'సంవత్సరం' },
  kn: { day: 'ದಿನ', month: 'ತಿಂಗಳು', year: 'ವರ್ಷ' },
  ta: { day: 'நாள்', month: 'மாதம்', year: 'ஆண்டு' },
  ml: { day: 'ദിവസം', month: 'മാസം', year: 'വർഷം' },
  hi: { day: 'दिन', month: 'महीना', year: 'वर्ष' },
  mr: { day: 'दिवस', month: 'महिना', year: 'वर्ष' },
  bn: { day: 'দিন', month: 'মাস', year: 'বছর' },
  gu: { day: 'દિવસ', month: 'મહિનો', year: 'વર્ષ' },
  pa: { day: 'ਦਿਨ', month: 'ਮਹੀਨਾ', year: 'ਸਾਲ' },
  raj: { day: 'दिन', month: 'महीनो', year: 'बरस' },
  or: { day: 'ଦିନ', month: 'ମାସ', year: 'ବର୍ଷ' },
  bho: { day: 'दिन', month: 'महीना', year: 'साल' },
};
