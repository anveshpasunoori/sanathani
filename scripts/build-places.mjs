// Builds src/data/places-builtin.json: the offline place list. Coordinates, states and time
// zones come from the Open-Meteo geocoder (GeoNames data, CC BY 4.0). Run: node scripts/build-places.mjs
import { writeFileSync } from 'node:fs';

// "Display name|CC|state filter (optional)|geocoder spelling (optional)"
const Q = `
Hyderabad|IN|Telangana;Secunderabad|IN;Warangal|IN;Hanamkonda|IN|Telangana;Karimnagar|IN;Khammam|IN;Nizamabad|IN|Telangana;Adilabad|IN;Asifabad|IN;Kothagudem|IN|Telangana|Kottagudem;Bhadrachalam|IN;Jagtial|IN;Jangaon|IN;Bhupalpally|IN;Gadwal|IN;Kamareddy|IN||Kamareddi;Mahabubabad|IN||Mahbubabad;Mahbubnagar|IN;Mancherial|IN;Medak|IN;Medchal|IN;Mulugu|IN|Telangana;Nagarkurnool|IN||Nagar Karnul;Nalgonda|IN;Narayanpet|IN;Nirmal|IN;Peddapalli|IN;Sircilla|IN|Telangana|Sirsilla;Sangareddy|IN||Sangareddi;Siddipet|IN;Suryapet|IN|Telangana|Suriapet;Vikarabad|IN;Wanaparthy|IN|Telangana|Wanparti;Bhongir|IN;Shamshabad|IN;Ramagundam|IN;Miryalaguda|IN;Bodhan|IN;Kodad|IN|Telangana|Kodar;Yadagirigutta|IN;Basar|IN|Telangana;Zahirabad|IN;Tandur|IN|Telangana
Visakhapatnam|IN;Vijayawada|IN;Guntur|IN|Andhra Pradesh;Tirupati|IN;Rajahmundry|IN;Kakinada|IN;Nellore|IN;Kurnool|IN;Anantapur|IN;Kadapa|IN;Chittoor|IN;Ongole|IN;Eluru|IN;Srikakulam|IN;Vizianagaram|IN;Parvathipuram|IN|Andhra Pradesh;Paderu|IN|Andhra Pradesh;Anakapalle|IN;Amalapuram|IN;Bhimavaram|IN;Machilipatnam|IN;Bapatla|IN;Narasaraopet|IN;Nandyal|IN;Puttaparthi|IN;Rayachoti|IN;Tenali|IN|Andhra Pradesh|Thenali;Proddatur|IN;Hindupur|IN;Adoni|IN;Madanapalle|IN;Chirala|IN;Tadepalligudem|IN;Gudivada|IN;Srikalahasti|IN;Kavali|IN;Dharmavaram|IN;Tanuku|IN;Narasapuram|IN;Amaravati|IN|Andhra Pradesh;Mangalagiri|IN;Palakollu|IN;Chilakaluripet|IN||Chilakalurupet;Markapur|IN;Gudur|IN|Andhra Pradesh;Tadpatri|IN;Kadiri|IN;Guntakal|IN;Srisailam|IN|Andhra Pradesh|Srisailain;Annavaram|IN|Andhra Pradesh;Bobbili|IN;Tuni|IN;Samalkot|IN;Jaggayyapeta|IN;Nuzvid|IN;Repalle|IN;Vinukonda|IN;Atmakur|IN|Andhra Pradesh
Bengaluru|IN;Mysuru|IN;Mangaluru|IN;Hubballi|IN;Belagavi|IN;Kalaburagi|IN;Ballari|IN;Udupi|IN;Shivamogga|IN;Davangere|IN;Tumakuru|IN;Bidar|IN;Raichur|IN
Chennai|IN;Coimbatore|IN;Madurai|IN;Tiruchirappalli|IN;Salem|IN|Tamil Nadu;Tirunelveli|IN;Vellore|IN;Hosur|IN;Kanchipuram|IN;Rameswaram|IN;Thanjavur|IN;Erode|IN;Tiruppur|IN;Kanyakumari|IN||Kanniyakumari
Thiruvananthapuram|IN;Kochi|IN;Kozhikode|IN;Thrissur|IN;Kannur|IN;Kollam|IN;Palakkad|IN
Mumbai|IN;Pune|IN;Nagpur|IN;Nashik|IN;Aurangabad|IN|Maharashtra;Solapur|IN;Kolhapur|IN;Thane|IN;Nanded|IN;Navi Mumbai|IN;Amravati|IN|Maharashtra;Shirdi|IN
Panaji|IN|Goa|Panjim;Margao|IN|Goa|Madgaon
Ahmedabad|IN;Surat|IN;Vadodara|IN;Rajkot|IN;Gandhinagar|IN;Dwarka|IN|Gujarat
Jaipur|IN;Jodhpur|IN;Udaipur|IN;Kota|IN|Rajasthan;Ajmer|IN;Bikaner|IN
New Delhi|IN;Gurugram|IN;Faridabad|IN;Noida|IN;Ghaziabad|IN
Chandigarh|IN;Ludhiana|IN;Amritsar|IN;Jalandhar|IN;Shimla|IN;Dehradun|IN;Haridwar|IN;Rishikesh|IN
Srinagar|IN;Jammu|IN;Leh|IN
Lucknow|IN;Kanpur|IN;Varanasi|IN;Prayagraj|IN;Agra|IN;Mathura|IN;Ayodhya|IN;Gorakhpur|IN;Meerut|IN
Patna|IN;Gaya|IN;Ranchi|IN;Jamshedpur|IN;Dhanbad|IN
Kolkata|IN;Siliguri|IN;Durgapur|IN;Bhubaneswar|IN;Cuttack|IN;Puri|IN;Rourkela|IN
Raipur|IN;Bhilai|IN;Bhopal|IN;Indore|IN;Jabalpur|IN;Gwalior|IN;Ujjain|IN
Guwahati|IN;Dibrugarh|IN;Shillong|IN;Imphal|IN;Aizawl|IN;Kohima|IN;Agartala|IN;Itanagar|IN;Gangtok|IN
Port Blair|IN;Puducherry|IN;Kavaratti|IN;Daman|IN;Silvassa|IN
New York|US;Edison|US|New Jersey;Jersey City|US;Princeton|US|New Jersey;Parsippany|US;Boston|US;Philadelphia|US;Washington, DC|US|District of Columbia|Washington;Baltimore|US;Pittsburgh|US;Richmond|US|Virginia;Ashburn|US;Raleigh|US;Charlotte|US;Atlanta|US;Orlando|US;Tampa|US;Miami|US;Jacksonville|US|Florida;Nashville|US;Chicago|US;Naperville|US;Detroit|US;Columbus|US|Ohio;Cleveland|US;Cincinnati|US;Indianapolis|US;Minneapolis|US;St. Louis|US;Kansas City|US|Missouri;Milwaukee|US;Dallas|US;Houston|US;Austin|US|Texas;San Antonio|US;Irving|US|Texas;Plano|US|Texas;Frisco|US|Texas;Denver|US;Phoenix|US;Salt Lake City|US;Las Vegas|US;Albuquerque|US;Los Angeles|US;San Diego|US;San Francisco|US;San Jose|US|California;Fremont|US|California;Sunnyvale|US;Sacramento|US;Seattle|US;Redmond|US|Washington;Bellevue|US|Washington;Portland|US|Oregon;Hartford|US;Stamford|US|Connecticut;Honolulu|US;Anchorage|US
Toronto|CA;Brampton|CA;Mississauga|CA;Markham|CA;Ottawa|CA;Montreal|CA;Vancouver|CA|British Columbia;Surrey|CA;Calgary|CA;Edmonton|CA;Winnipeg|CA
London|GB;Leicester|GB;Birmingham|GB;Manchester|GB;Leeds|GB;Glasgow|GB;Edinburgh|GB;Dublin|IE
Paris|FR;Berlin|DE;Munich|DE;Frankfurt am Main|DE;Amsterdam|NL;Brussels|BE;Zurich|CH;Geneva|CH;Stockholm|SE;Oslo|NO;Copenhagen|DK;Helsinki|FI;Rome|IT;Milan|IT;Madrid|ES;Barcelona|ES;Lisbon|PT;Vienna|AT;Warsaw|PL;Prague|CZ
Dubai|AE;Abu Dhabi|AE;Sharjah|AE;Doha|QA;Muscat|OM;Kuwait City|KW;Manama|BH;Riyadh|SA;Jeddah|SA;Dammam|SA
Singapore|SG;Kuala Lumpur|MY;Bangkok|TH;Jakarta|ID;Hong Kong|HK;Tokyo|JP;Seoul|KR;Shanghai|CN;Beijing|CN;Manila|PH;Ho Chi Minh City|VN;Kathmandu|NP;Colombo|LK;Dhaka|BD;Karachi|PK;Lahore|PK;Thimphu|BT;Male|MV
Sydney|AU;Melbourne|AU;Brisbane|AU;Perth|AU;Adelaide|AU;Canberra|AU;Auckland|NZ;Wellington|NZ;Suva|FJ
Johannesburg|ZA;Durban|ZA;Cape Town|ZA;Nairobi|KE;Mombasa|KE;Dar es Salaam|TZ;Kampala|UG;Lagos|NG;Port Louis|MU;Cairo|EG
Port of Spain|TT;Georgetown|GY;Paramaribo|SR;Mexico City|MX;Sao Paulo|BR;Buenos Aires|AR;Kingston|JM
`.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);

const strip = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const out = [];
const missing = [];
const review = [];
for (const q of Q) {
  const [display, cc, state, apiName] = q.split('|');
  const name = apiName || display.replace(/,.*$/, '');
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20&language=en&format=json&countryCode=${cc}`;
  const data = await (await fetch(url)).json();
  const hits = (data.results ?? []).filter((r) => r.country_code === cc && r.timezone && (!state || r.admin1 === state) && !/airport|island/i.test(r.name));
  const byPop = (a, b) => (b.population ?? 0) - (a.population ?? 0);
  const exact = hits.filter((r) => strip(r.name) === strip(name)).sort(byPop);
  const prefix = hits.filter((r) => strip(r.name).startsWith(strip(name).slice(0, 5))).sort(byPop);
  const r = exact[0] ?? prefix[0];
  if (!r) { missing.push(q); continue; }
  if (strip(r.name) !== strip(name)) review.push(`${display} -> ${r.name} (${r.admin1})`);
  out.push({ n: display.replace(/,.*$/, ''), a: r.admin1 ?? '', c: r.country ?? '', cc, lat: +r.latitude.toFixed(4), lon: +r.longitude.toFixed(4), tz: r.timezone, p: r.population ?? 0 });
}
writeFileSync(new URL('../src/data/places-builtin.json', import.meta.url), JSON.stringify(out));
console.log(`${out.length} places written`);
if (missing.length) console.log('Missing:', missing.join(', '));
if (review.length) console.log('Spelling differs:\n ' + review.join('\n '));
