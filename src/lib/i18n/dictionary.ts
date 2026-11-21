import type { Locale } from "@/types";

// UI strings. Khmer is the source of truth; English must have the same keys.
// Add keys here as screens are built. Use `const { t } = useLocale()`.

const km = {
  appName: "សំឡេងក្រុង",
  appTagline: "វេទិកាសេវាប្រជាពលរដ្ឋ",
  sos: "អាសន្ន",
  login: "ចូលគណនី",
  logout: "ចាកចេញ",
  register: "ចុះឈ្មោះ",
  optional: "មិនចាំបាច់",
  submitting: "កំពុងដំណើរការ…",
  roleCITIZEN: "ប្រជាពលរដ្ឋ",
  roleOFFICER: "មន្ត្រី",
  roleADMIN: "អ្នកគ្រប់គ្រង",
  province: "ខេត្ត / រាជធានី",
  city: "ក្រុង / ខណ្ឌ",
  errGeneric: "មានបញ្ហា សូមព្យាយាមម្តងទៀត",
  errLogin: "លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ",
};

export type Dictionary = typeof km;

const en: Dictionary = {
  appName: "CityVoice",
  appTagline: "Citizen services platform",
  sos: "SOS",
  login: "Log in",
  logout: "Log out",
  register: "Register",
  optional: "optional",
  submitting: "Working…",
  roleCITIZEN: "Citizen",
  roleOFFICER: "Officer",
  roleADMIN: "Admin",
  province: "Province",
  city: "City / khan",
  errGeneric: "Something went wrong. Try again.",
  errLogin: "Wrong phone number or password",
};

export const DICTIONARIES: Record<Locale, Dictionary> = { km, en };
