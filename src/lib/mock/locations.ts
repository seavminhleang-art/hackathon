// Cambodia's 25 provinces (incl. Phnom Penh capital) and their cities.
// Phnom Penh is split into its 14 khans; every other province lists its
// provincial town (krong) for now. Add more districts when needed.
// Coordinates are approximate centers, good enough for "nearby" matching.

import type { City, Province } from "@/types";

export const PROVINCES: Province[] = [
  { id: "phnom-penh", name: { km: "ភ្នំពេញ", en: "Phnom Penh" }, center: { lat: 11.5564, lng: 104.9282 } },
  { id: "banteay-meanchey", name: { km: "បន្ទាយមានជ័យ", en: "Banteay Meanchey" }, center: { lat: 13.59, lng: 102.97 } },
  { id: "battambang", name: { km: "បាត់ដំបង", en: "Battambang" }, center: { lat: 13.1, lng: 103.2 } },
  { id: "kampong-cham", name: { km: "កំពង់ចាម", en: "Kampong Cham" }, center: { lat: 12.0, lng: 105.46 } },
  { id: "kampong-chhnang", name: { km: "កំពង់ឆ្នាំង", en: "Kampong Chhnang" }, center: { lat: 12.25, lng: 104.67 } },
  { id: "kampong-speu", name: { km: "កំពង់ស្ពឺ", en: "Kampong Speu" }, center: { lat: 11.45, lng: 104.52 } },
  { id: "kampong-thom", name: { km: "កំពង់ធំ", en: "Kampong Thom" }, center: { lat: 12.71, lng: 104.89 } },
  { id: "kampot", name: { km: "កំពត", en: "Kampot" }, center: { lat: 10.61, lng: 104.18 } },
  { id: "kandal", name: { km: "កណ្ដាល", en: "Kandal" }, center: { lat: 11.48, lng: 104.95 } },
  { id: "kep", name: { km: "កែប", en: "Kep" }, center: { lat: 10.48, lng: 104.32 } },
  { id: "koh-kong", name: { km: "កោះកុង", en: "Koh Kong" }, center: { lat: 11.62, lng: 102.98 } },
  { id: "kratie", name: { km: "ក្រចេះ", en: "Kratie" }, center: { lat: 12.49, lng: 106.02 } },
  { id: "mondulkiri", name: { km: "មណ្ឌលគិរី", en: "Mondulkiri" }, center: { lat: 12.45, lng: 107.2 } },
  { id: "oddar-meanchey", name: { km: "ឧត្តរមានជ័យ", en: "Oddar Meanchey" }, center: { lat: 14.18, lng: 103.52 } },
  { id: "pailin", name: { km: "ប៉ៃលិន", en: "Pailin" }, center: { lat: 12.85, lng: 102.61 } },
  { id: "preah-sihanouk", name: { km: "ព្រះសីហនុ", en: "Preah Sihanouk" }, center: { lat: 10.63, lng: 103.52 } },
  { id: "preah-vihear", name: { km: "ព្រះវិហារ", en: "Preah Vihear" }, center: { lat: 13.81, lng: 104.97 } },
  { id: "prey-veng", name: { km: "ព្រៃវែង", en: "Prey Veng" }, center: { lat: 11.48, lng: 105.33 } },
  { id: "pursat", name: { km: "ពោធិ៍សាត់", en: "Pursat" }, center: { lat: 12.54, lng: 103.92 } },
  { id: "ratanakiri", name: { km: "រតនគិរី", en: "Ratanakiri" }, center: { lat: 13.74, lng: 106.99 } },
  { id: "siem-reap", name: { km: "សៀមរាប", en: "Siem Reap" }, center: { lat: 13.36, lng: 103.86 } },
  { id: "stung-treng", name: { km: "ស្ទឹងត្រែង", en: "Stung Treng" }, center: { lat: 13.53, lng: 105.97 } },
  { id: "svay-rieng", name: { km: "ស្វាយរៀង", en: "Svay Rieng" }, center: { lat: 11.09, lng: 105.8 } },
  { id: "takeo", name: { km: "តាកែវ", en: "Takeo" }, center: { lat: 10.99, lng: 104.78 } },
  { id: "tbong-khmum", name: { km: "ត្បូងឃ្មុំ", en: "Tbong Khmum" }, center: { lat: 11.91, lng: 105.65 } },
];

const PP = "phnom-penh";

export const CITIES: City[] = [
  // Phnom Penh khans
  { id: "chamkar-mon", provinceId: PP, name: { km: "ខណ្ឌចំការមន", en: "Chamkar Mon" }, center: { lat: 11.5449, lng: 104.9214 } },
  { id: "doun-penh", provinceId: PP, name: { km: "ខណ្ឌដូនពេញ", en: "Doun Penh" }, center: { lat: 11.5696, lng: 104.9244 } },
  { id: "prampir-makara", provinceId: PP, name: { km: "ខណ្ឌ៧មករា", en: "Prampir Makara" }, center: { lat: 11.5636, lng: 104.9111 } },
  { id: "tuol-kouk", provinceId: PP, name: { km: "ខណ្ឌទួលគោក", en: "Tuol Kouk" }, center: { lat: 11.5802, lng: 104.9003 } },
  { id: "boeng-keng-kang", provinceId: PP, name: { km: "ខណ្ឌបឹងកេងកង", en: "Boeng Keng Kang" }, center: { lat: 11.5523, lng: 104.9282 } },
  { id: "dangkao", provinceId: PP, name: { km: "ខណ្ឌដង្កោ", en: "Dangkao" }, center: { lat: 11.4957, lng: 104.8686 } },
  { id: "mean-chey", provinceId: PP, name: { km: "ខណ្ឌមានជ័យ", en: "Mean Chey" }, center: { lat: 11.5196, lng: 104.9295 } },
  { id: "russey-keo", provinceId: PP, name: { km: "ខណ្ឌឫស្សីកែវ", en: "Russey Keo" }, center: { lat: 11.6136, lng: 104.9032 } },
  { id: "sen-sok", provinceId: PP, name: { km: "ខណ្ឌសែនសុខ", en: "Sen Sok" }, center: { lat: 11.5916, lng: 104.8722 } },
  { id: "pou-senchey", provinceId: PP, name: { km: "ខណ្ឌពោធិ៍សែនជ័យ", en: "Pou Senchey" }, center: { lat: 11.5408, lng: 104.8267 } },
  { id: "chroy-changvar", provinceId: PP, name: { km: "ខណ្ឌជ្រោយចង្វារ", en: "Chroy Changvar" }, center: { lat: 11.5998, lng: 104.9367 } },
  { id: "prek-pnov", provinceId: PP, name: { km: "ខណ្ឌព្រែកព្នៅ", en: "Prek Pnov" }, center: { lat: 11.6612, lng: 104.8732 } },
  { id: "chbar-ampov", provinceId: PP, name: { km: "ខណ្ឌច្បារអំពៅ", en: "Chbar Ampov" }, center: { lat: 11.5354, lng: 104.9488 } },
  { id: "kamboul", provinceId: PP, name: { km: "ខណ្ឌកំបូល", en: "Kamboul" }, center: { lat: 11.5308, lng: 104.7811 } },
  // Provincial towns
  { id: "serei-saophoan", provinceId: "banteay-meanchey", name: { km: "ក្រុងសិរីសោភ័ណ", en: "Serei Saophoan" }, center: { lat: 13.59, lng: 102.97 } },
  { id: "battambang-city", provinceId: "battambang", name: { km: "ក្រុងបាត់ដំបង", en: "Battambang City" }, center: { lat: 13.1, lng: 103.2 } },
  { id: "kampong-cham-city", provinceId: "kampong-cham", name: { km: "ក្រុងកំពង់ចាម", en: "Kampong Cham City" }, center: { lat: 12.0, lng: 105.46 } },
  { id: "kampong-chhnang-city", provinceId: "kampong-chhnang", name: { km: "ក្រុងកំពង់ឆ្នាំង", en: "Kampong Chhnang City" }, center: { lat: 12.25, lng: 104.67 } },
  { id: "chbar-mon", provinceId: "kampong-speu", name: { km: "ក្រុងច្បារមន", en: "Chbar Mon" }, center: { lat: 11.45, lng: 104.52 } },
  { id: "stueng-saen", provinceId: "kampong-thom", name: { km: "ក្រុងស្ទឹងសែន", en: "Stueng Saen" }, center: { lat: 12.71, lng: 104.89 } },
  { id: "kampot-city", provinceId: "kampot", name: { km: "ក្រុងកំពត", en: "Kampot City" }, center: { lat: 10.61, lng: 104.18 } },
  { id: "ta-khmau", provinceId: "kandal", name: { km: "ក្រុងតាខ្មៅ", en: "Ta Khmau" }, center: { lat: 11.48, lng: 104.95 } },
  { id: "kep-city", provinceId: "kep", name: { km: "ក្រុងកែប", en: "Kep City" }, center: { lat: 10.48, lng: 104.32 } },
  { id: "khemarak-phoumin", provinceId: "koh-kong", name: { km: "ក្រុងខេមរភូមិន្ទ", en: "Khemarak Phoumin" }, center: { lat: 11.62, lng: 102.98 } },
  { id: "kratie-city", provinceId: "kratie", name: { km: "ក្រុងក្រចេះ", en: "Kratie City" }, center: { lat: 12.49, lng: 106.02 } },
  { id: "senmonorom", provinceId: "mondulkiri", name: { km: "ក្រុងសែនមនោរម្យ", en: "Senmonorom" }, center: { lat: 12.45, lng: 107.2 } },
  { id: "samraong", provinceId: "oddar-meanchey", name: { km: "ក្រុងសំរោង", en: "Samraong" }, center: { lat: 14.18, lng: 103.52 } },
  { id: "pailin-city", provinceId: "pailin", name: { km: "ក្រុងប៉ៃលិន", en: "Pailin City" }, center: { lat: 12.85, lng: 102.61 } },
  { id: "sihanoukville", provinceId: "preah-sihanouk", name: { km: "ក្រុងព្រះសីហនុ", en: "Sihanoukville" }, center: { lat: 10.63, lng: 103.52 } },
  { id: "preah-vihear-city", provinceId: "preah-vihear", name: { km: "ក្រុងព្រះវិហារ", en: "Preah Vihear City" }, center: { lat: 13.81, lng: 104.97 } },
  { id: "prey-veng-city", provinceId: "prey-veng", name: { km: "ក្រុងព្រៃវែង", en: "Prey Veng City" }, center: { lat: 11.48, lng: 105.33 } },
  { id: "pursat-city", provinceId: "pursat", name: { km: "ក្រុងពោធិ៍សាត់", en: "Pursat City" }, center: { lat: 12.54, lng: 103.92 } },
  { id: "banlung", provinceId: "ratanakiri", name: { km: "ក្រុងបានលុង", en: "Banlung" }, center: { lat: 13.74, lng: 106.99 } },
  { id: "siem-reap-city", provinceId: "siem-reap", name: { km: "ក្រុងសៀមរាប", en: "Siem Reap City" }, center: { lat: 13.36, lng: 103.86 } },
  { id: "stung-treng-city", provinceId: "stung-treng", name: { km: "ក្រុងស្ទឹងត្រែង", en: "Stung Treng City" }, center: { lat: 13.53, lng: 105.97 } },
  { id: "svay-rieng-city", provinceId: "svay-rieng", name: { km: "ក្រុងស្វាយរៀង", en: "Svay Rieng City" }, center: { lat: 11.09, lng: 105.8 } },
  { id: "doun-kaev", provinceId: "takeo", name: { km: "ក្រុងដូនកែវ", en: "Doun Kaev" }, center: { lat: 10.99, lng: 104.78 } },
  { id: "suong", provinceId: "tbong-khmum", name: { km: "ក្រុងសួង", en: "Suong" }, center: { lat: 11.91, lng: 105.65 } },
];

export const citiesOf = (provinceId: string) => CITIES.filter((c) => c.provinceId === provinceId);
export const findCity = (id: string) => CITIES.find((c) => c.id === id);
export const findProvince = (id: string) => PROVINCES.find((p) => p.id === id);

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
