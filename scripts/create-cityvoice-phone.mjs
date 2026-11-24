import fs from "node:fs/promises";
import sharp from "sharp";

const root = process.cwd();
const logo = (await fs.readFile(`${root}/public/cityvoice-logo-transparent.png`)).toString("base64");
const city = (await sharp(`${root}/public/images/hero/phnom-penh-skyline.webp`).resize(640, 390, { fit: "cover" }).png().toBuffer()).toString("base64");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1600" viewBox="0 0 1400 1600">
 <defs>
  <linearGradient id="titanium" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3a3d44"/><stop offset=".18" stop-color="#08090c"/><stop offset=".5" stop-color="#25282e"/><stop offset=".78" stop-color="#050608"/><stop offset="1" stop-color="#62666e"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#878b93"/><stop offset=".2" stop-color="#15171b"/><stop offset=".8" stop-color="#08090b"/><stop offset="1" stop-color="#777b83"/></linearGradient>
  <linearGradient id="screen" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#f8f7f3"/></linearGradient>
  <linearGradient id="cityFade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#032ea1" stop-opacity="0"/><stop offset="1" stop-color="#071b4d" stop-opacity=".82"/></linearGradient>
  <linearGradient id="blueCard" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#123cbd"/><stop offset="1" stop-color="#032ea1"/></linearGradient>
  <filter id="shadow" x="-45%" y="-35%" width="190%" height="190%"><feGaussianBlur in="SourceAlpha" stdDeviation="22"/><feOffset dy="15" dx="4" result="blur"/><feComponentTransfer><feFuncA type="linear" slope=".17"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="phoneShadow" x="-45%" y="-35%" width="190%" height="190%"><feGaussianBlur in="SourceAlpha" stdDeviation="30"/><feOffset dy="26" dx="7" result="blur"/><feComponentTransfer><feFuncA type="linear" slope=".3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="ground" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="25"/></filter>
  <clipPath id="screenClip"><rect x="313" y="162" width="574" height="1274" rx="68"/></clipPath>
  <clipPath id="photoClip"><rect x="1128" y="431" width="226" height="146" rx="20"/></clipPath>
 </defs>

 <!-- Transparent composition, with visual cues taken from the live CityVoice home page -->
 <ellipse cx="730" cy="1450" rx="330" ry="42" fill="#172033" opacity=".13" filter="url(#ground)"/>
 <path d="M46 1242 C147 1289 218 1336 278 1388" fill="none" stroke="#9fbce9" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round" opacity=".7"/>
 <path d="M1350 1235 C1260 1280 1189 1337 1134 1390" fill="none" stroke="#9fbce9" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round" opacity=".7"/>
 <circle cx="47" cy="1242" r="8" fill="#032ea1" opacity=".58"/><circle cx="278" cy="1388" r="8" fill="#c99a2e" opacity=".85"/>
 <circle cx="1350" cy="1235" r="8" fill="#032ea1" opacity=".58"/><circle cx="1134" cy="1390" r="8" fill="#c99a2e" opacity=".85"/>
 <circle cx="296" cy="379" r="7" fill="#c99a2e"/><circle cx="1091" cy="690" r="6" fill="#c99a2e"/><circle cx="104" cy="1058" r="5" fill="#032ea1" opacity=".58"/>

 <!-- announcement ticker card: the real site uses a red civic-alert strip -->
 <g transform="rotate(-5 185 451)" filter="url(#shadow)">
  <rect x="39" y="394" width="294" height="116" rx="22" fill="#fff"/>
  <rect x="39" y="394" width="9" height="116" rx="4.5" fill="#c8102e"/>
  <circle cx="81" cy="438" r="22" fill="#fdecee"/>
  <path d="M72 436a9 9 0 0 1 18 0v8l4 5H68l4-5zm7 17h4" fill="none" stroke="#c8102e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="116" y="435" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#1c1a17">សេចក្ដីជូនដំណឹង</text>
  <text x="116" y="466" font-family="Arial,sans-serif" font-size="15" fill="#6b6457">ព័ត៌មានថ្មីៗ ពីសហគមន៍</text>
  <circle cx="290" cy="451" r="4" fill="#c8102e"/>
 </g>

 <!-- report action tile, drawn like the home page quick action -->
 <g transform="rotate(4 186 812)" filter="url(#shadow)">
  <rect x="38" y="704" width="302" height="214" rx="26" fill="url(#blueCard)"/>
  <rect x="61" y="729" width="64" height="64" rx="19" fill="#fff" fill-opacity=".16"/>
  <path d="M78 747h29a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H97l-10 8v-8h-9a4 4 0 0 1-4-4v-19a4 4 0 0 1 4-4Z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M92 751v10m0 5v1" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <text x="61" y="834" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#fff">រាយការណ៍បញ្ហា</text>
  <text x="61" y="866" font-family="Arial,sans-serif" font-size="15" fill="#fff" fill-opacity=".88">ផ្លូវ · សំរាម · លូ · ភ្លើងបំភ្លឺ</text>
  <path d="M61 887h247" stroke="#fff" stroke-opacity=".26" stroke-width="1.5"/>
  <text x="61" y="907" font-family="Arial,sans-serif" font-size="13" fill="#fff" fill-opacity=".8">សេវាកម្មក្រុង នៅក្បែរអ្នក</text>
 </g>

 <!-- Phnom Penh hero photo tile, matching the live home carousel -->
 <g transform="rotate(5 1241 523)" filter="url(#shadow)">
  <rect x="1110" y="413" width="262" height="256" rx="27" fill="#fff"/>
  <g clip-path="url(#photoClip)">
   <image x="1128" y="431" width="226" height="146" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${city}"/>
   <rect x="1128" y="431" width="226" height="146" fill="url(#cityFade)"/>
  </g>
  <circle cx="1144" cy="613" r="13" fill="#eaf0fc"/>
  <path d="M1144 620s-6-7-6-11a6 6 0 1 1 12 0c0 4-6 11-6 11Z" fill="none" stroke="#032ea1" stroke-width="1.7"/>
  <circle cx="1144" cy="609" r="2" fill="#032ea1"/>
  <text x="1167" y="610" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#1c1a17">ភ្នំពេញ</text>
  <text x="1167" y="635" font-family="Arial,sans-serif" font-size="13" fill="#6b6457">ទីក្រុងរបស់យើង</text>
  <circle cx="1334" cy="616" r="15" fill="#eaf0fc"/>
  <path d="m1331 610 6 6-6 6" fill="none" stroke="#032ea1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </g>

 <!-- a compact report-status card, echoing the city overview strip -->
 <g transform="rotate(-4 1226 1038)" filter="url(#shadow)">
  <rect x="1080" y="950" width="290" height="178" rx="25" fill="#fff"/>
  <text x="1104" y="987" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#1c1a17">ទិដ្ឋភាពទូទៅក្រុង</text>
  <rect x="1104" y="1006" width="242" height="1.5" fill="#e6e0d6"/>
  <circle cx="1123" cy="1040" r="13" fill="#e7f4ec"/><path d="m1117 1040 4 4 8-9" fill="none" stroke="#0f5434" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="1147" y="1046" font-family="Arial,sans-serif" font-size="15" fill="#6b6457">បានដោះស្រាយ</text>
  <text x="1320" y="1046" text-anchor="end" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#0f5434">128</text>
  <circle cx="1123" cy="1083" r="13" fill="#fef3d6"/><circle cx="1123" cy="1083" r="6" fill="none" stroke="#8a4a05" stroke-width="2"/><path d="M1123 1080v4l3 2" fill="none" stroke="#8a4a05" stroke-width="1.6"/>
  <text x="1147" y="1089" font-family="Arial,sans-serif" font-size="15" fill="#6b6457">កំពុងជួសជុល</text>
  <text x="1320" y="1089" text-anchor="end" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#8a4a05">24</text>
 </g>

 <!-- phone: refined black titanium frame, with only the CityVoice logo on screen -->
 <g transform="translate(110 0) rotate(-7 600 800)" filter="url(#phoneShadow)">
  <rect x="274" y="104" width="652" height="1390" rx="100" fill="url(#titanium)"/>
  <rect x="281" y="111" width="638" height="1376" rx="94" fill="url(#edge)" stroke="#858991" stroke-opacity=".4" stroke-width="2"/>
  <rect x="294" y="124" width="612" height="1350" rx="83" fill="#030406"/>
  <g clip-path="url(#screenClip)">
   <rect x="313" y="162" width="574" height="1274" fill="url(#screen)"/>
   <image x="365" y="708" width="470" height="141" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${logo}"/>
   <text x="600" y="892" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="600" letter-spacing=".3" fill="#6b6457">Citizen services for Cambodia</text>
  </g>
  <rect x="313" y="162" width="574" height="1274" rx="68" fill="none" stroke="#b8bbc2" stroke-opacity=".56" stroke-width="2"/>
  <path d="M330 253V218q0-38 38-38h12" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="4" stroke-linecap="round"/>
  <rect x="493" y="174" width="214" height="48" rx="24" fill="#030407"/>
  <circle cx="672" cy="198" r="7" fill="#111b35"/><circle cx="672" cy="198" r="3" fill="#1c4ca5"/>
  <rect x="551" y="191" width="84" height="6" rx="3" fill="#272a31"/>
  <rect x="266" y="343" width="9" height="94" rx="4.5" fill="#878b92"/>
  <rect x="266" y="464" width="9" height="115" rx="4.5" fill="#767a82"/>
  <rect x="924" y="425" width="9" height="151" rx="4.5" fill="#8c9097"/>
 </g>
</svg>`;

const outDir = `${root}/public/images/presentation`;
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(`${outDir}/cityvoice-phone.svg`, svg);
await sharp(Buffer.from(svg)).png().toFile(`${outDir}/cityvoice-phone.png`);
console.log(`${outDir}/cityvoice-phone.png`);
