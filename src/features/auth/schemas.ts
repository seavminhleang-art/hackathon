import { z } from "zod";
import { api } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Zod schemas for the login and register forms (used through React Hook Form's zodResolver).
 * Messages come from the dictionary, so the schemas are built per locale.
 * Each multi-step form validates only the current step's fields with `trigger(STEP_FIELDS)`.
 */

const KHMER_DIGIT = /[០-៩]/g;
/** "០១២" → "012", then keep digits only, max 6. */
export const toCodeDigits = (v: string) =>
  v
    .replace(KHMER_DIGIT, (d) => String(d.charCodeAt(0) - 0x17e0))
    .replace(/\D/g, "")
    .slice(0, 6);

const codeRule = (t: Dictionary) => z.string().regex(/^\d{6}$/, t.authCodeIncomplete);
const channelRule = z.enum(["EMAIL", "TELEGRAM"]);

export function loginSchema(t: Dictionary) {
  return z.object({
    identifier: z.string().trim().min(1, t.authIdentifierRequired),
    password: z.string().min(1, t.authPasswordRequired),
    channel: channelRule,
    code: codeRule(t),
  });
}
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

export function registerSchema(t: Dictionary) {
  return z
    .object({
      provider: z.enum(["PASSWORD", "GOOGLE"]),
      username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3, t.authUsernameShort)
        .max(20, t.authUsernameLong)
        .regex(/^[a-z0-9_.]+$/, t.authUsernameChars),
      lastName: z.string().trim().min(1, t.authLastNameRequired),
      firstName: z.string().trim().min(1, t.authFirstNameRequired),
      email: z.string().trim().min(1, t.authEmailRequired).pipe(z.email(t.authEmailRequired)),
      phone: z
        .string()
        .trim()
        .refine((v) => !v || api.normalizePhone(v) !== null, t.authPhoneInvalid),
      password: z.string(),
      provinceId: z.string().min(1, t.authChooseLocation),
      cityId: z.string().min(1, t.authChooseLocation),
      channel: channelRule,
      code: codeRule(t),
    })
    // Google accounts have no password. `when` runs this even while other steps' fields are still empty.
    .refine((v) => v.provider === "GOOGLE" || v.password.length >= 8, {
      path: ["password"],
      message: t.authPasswordShort8,
      when: () => true,
    });
}
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;
