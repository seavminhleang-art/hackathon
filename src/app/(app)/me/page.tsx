import { redirect } from "next/navigation";

/** The old /me page now lives in the Me area: /dashboard/profile (account + emergency contacts + medical info). */
export default function MePage() {
  redirect("/dashboard/profile");
}
