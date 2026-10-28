// Deity pictures for the Pooja tab, bundled in public/deities. Ganapathi, Lakshmi, Vishnu, Hanuman, Shiva,
// Durga, Saraswati, Subrahmanya, Rama, Krishna, Surya, Shani, Narasimha, Dattatreya and Kubera are cropped from the app owner's own deity artwork (all 24 crops are kept in assets/deity-grid for
// future poojas). Ayyappa, the Vishu and Puthandu kani and the Kannada Ugadi, Gudi Padwa and Nav Samvatsar pictures are the app owner's own pictures; Lalitha comes from Wikimedia Commons under CC BY-SA,
// so its credit is shown under the picture. The Telugu Ugadi picture is also the owner's own (the earlier Freepik illustration is kept in assets).
export type DeityImageId =
  | 'ganapathi' | 'lakshmi' | 'vishnu' | 'hanuman' | 'lalitha' | 'ayyappa' | 'ugadi'
  | 'shiva' | 'durga' | 'saraswati' | 'kartikeya' | 'rama' | 'krishna' | 'surya' | 'shani' | 'narasimha' | 'dattatreya' | 'kubera'
  | 'vehicle' | 'venkateswara' | 'vishu' | 'puthandu' | 'ugadi-kn' | 'gudi-padwa' | 'nav-samvatsar' | 'andal' | 'pinda' | 'nithya' | 'varalakshmi' | 'purnima-amavasya' | 'birthday' | 'anniversary';

export interface DeityImage { src: string; title: string; artist: string; license: string; url: string; focus: string }

/** The app owner's own artwork: no third-party credit needed. */
const own = (src: string, title: string, focus = '50% 30%'): DeityImage => ({ src, title, artist: '', license: 'own', url: '', focus });

export const DEITY_IMAGES: Record<DeityImageId, DeityImage> = {
  ayyappa: own('/deities/ayyappa.webp', 'Ayyappa Swamy', '50% 25%'),
  venkateswara: own('/deities/venkateswara.webp', 'Sri Venkateswara Swamy', '50% 30%'),
  ganapathi: own('/deities/ganesha.webp', 'Lord Ganesha'),
  hanuman: own('/deities/hanuman.webp', 'Lord Hanuman'),
  lakshmi: own('/deities/lakshmi.webp', 'Goddess Lakshmi'),
  lalitha: { src: '/deities/lalitha.webp', title: "Goddess Lalita Tripura Sundari", artist: "Ckvicky1992", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Goddess_Lalita_Tripura_Sundari.jpg", focus: '50% 25%' },
  ugadi: own('/deities/ugadi.webp', 'Ugadi kalasham and pachadi', '45% 50%'),
  vishnu: own('/deities/vishnu.webp', 'Lord Vishnu'),
  shiva: own('/deities/shiva.webp', 'Lord Shiva'),
  durga: own('/deities/durga.webp', 'Goddess Durga'),
  saraswati: own('/deities/saraswati.webp', 'Goddess Saraswati'),
  kartikeya: own('/deities/kartikeya.webp', 'Lord Subrahmanya'),
  rama: own('/deities/rama.webp', 'Lord Sri Rama'),
  krishna: own('/deities/krishna.webp', 'Lord Sri Krishna'),
  andal: own('/deities/andal.webp', 'Sri Andal (Goda Devi)', '50% 22%'),
  pinda: own('/deities/pinda.webp', 'Pinda pradanam by the river', '50% 60%'),
  nithya: own('/deities/nithya.webp', 'Home pooja mandir set for nithya pooja', '50% 40%'),
  anniversary: own('/deities/anniversary.webp', 'A couple performing a homam with a priest on their wedding anniversary', '45% 45%'),
  birthday: own('/deities/birthday.webp', 'A family lighting lamps together before the home shrine', '50% 55%'),
  'purnima-amavasya': own('/deities/purnima-amavasya.webp', 'Goddess Lakshmi on a lotus before the full moon and its phases', '50% 35%'),
  varalakshmi: own('/deities/varalakshmi.webp', 'Sri Varalakshmi vratham mandapam', '50% 30%'),
  surya: own('/deities/surya.webp', 'Lord Surya'),
  shani: own('/deities/shani.webp', 'Lord Shani'),
  narasimha: own('/deities/narasimha.webp', 'Lord Narasimha'),
  dattatreya: own('/deities/dattatreya.webp', 'Lord Dattatreya'),
  kubera: own('/deities/kubera.webp', 'Lord Kubera'),
  vehicle: own('/deities/vehicle.webp', 'Vehicle pooja', '50% 50%'),
  vishu: own('/deities/vishu.webp', 'Vishu kani', '45% 50%'),
  puthandu: own('/deities/puthandu.webp', 'Puthandu kani', '50% 60%'),
  'ugadi-kn': own('/deities/ugadi-kn.webp', 'Ugadi pooja', '50% 60%'),
  'gudi-padwa': own('/deities/gudi-padwa.webp', 'Gudi Padwa gudi', '38% 45%'),
  'nav-samvatsar': own('/deities/nav-samvatsar.webp', 'Nav Samvatsar kalash', '50% 50%'),
};

export const creditLine = (i: DeityImage) => `${i.title} — ${i.artist} · ${i.license} · Wikimedia Commons`;
