"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, FileText, KeyRound, Siren, Users } from "lucide-react";
import { Button, Card, EmptyState, FilterChips, PageHeader, SkeletonRows } from "@/components/ui";
import { PageContainer } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatDateParts } from "@/lib/i18n/format";
import type { AppNotification } from "@/types";

type Filter = "all" | "unread" | "read";

function targetFor(notification: AppNotification) {
  if (notification.type.startsWith("GR_") && notification.reportId) return `/reports/${notification.reportId}`;
  if (notification.type.startsWith("EM_") && notification.incidentId) return `/emergency/${notification.incidentId}`;
  if (notification.type.startsWith("LF_") && notification.postId) return `/lost-found/${notification.postId}`;
  if (notification.announcementId) return `/announcements/${notification.announcementId}`;
  const postId = notification.csPostId ?? notification.postId;
  if (postId) return `/community/posts/${postId}`;
  return "/dashboard";
}

function typeIcon(type: AppNotification["type"]) {
  if (type.startsWith("GR_")) return FileText;
  if (type.startsWith("EM_")) return Siren;
  if (type.startsWith("LF_")) return KeyRound;
  return Users;
}

function cambodiaDay(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function NotificationsScreen() {
  const { user, ready } = useAuth();
  const { t, tx, locale } = useLocale();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function refresh() {
    setError(false);
    try {
      setItems(await api.myNotifications());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !user) {
      setLoading(false);
      return;
    }
    void refresh();
    // Refresh the page when a notification changes elsewhere in the app.
    const onChanged = () => void refresh();
    window.addEventListener("cityvoice:notifications", onChanged);
    return () => window.removeEventListener("cityvoice:notifications", onChanged);
    // Auth state is the only trigger; refresh is intentionally stable for this subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  const unread = items.filter((item) => !item.read).length;
  const visible = useMemo(
    () => items.filter((item) => filter === "all" || (filter === "unread" ? !item.read : item.read)),
    [items, filter],
  );
  const today = cambodiaDay(new Date().toISOString());
  const todayItems = visible.filter((item) => cambodiaDay(item.createdAt) === today);
  const earlierItems = visible.filter((item) => cambodiaDay(item.createdAt) !== today);

  async function markRead(item: AppNotification) {
    if (item.read) return;
    setItems((current) => current.map((n) => n.id === item.id ? { ...n, read: true } : n));
    await api.markNotificationRead(item.id);
    window.dispatchEvent(new Event("cityvoice:notifications"));
  }

  async function markAllRead() {
    const unreadItems = items.filter((item) => !item.read);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    await Promise.all(unreadItems.map((item) => api.markNotificationRead(item.id)));
    window.dispatchEvent(new Event("cityvoice:notifications"));
  }

  if (!ready || (ready && !user)) {
    return (
      <PageContainer>
        <PageHeader title={t.notificationCenter} subtitle={t.notificationHint} />
        <Card className="text-center">
          <p className="text-body text-ink-muted">{locale === "km" ? "សូមចូលគណនីដើម្បីមើលដំណឹងរបស់អ្នក។" : "Sign in to view your notifications."}</p>
          <Link href="/login?next=/notifications" className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-white">{t.login}</Link>
        </Card>
      </PageContainer>
    );
  }

  const options = [
    { value: "all" as const, label: `${t.notificationAll} · ${items.length}`, icon: Bell },
    { value: "unread" as const, label: `${t.notificationUnread} · ${unread}`, icon: Bell },
    { value: "read" as const, label: t.notificationRead, icon: Check },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t.notificationCenter}
        subtitle={t.notificationHint}
        actions={unread > 0 ? <Button variant="secondary" size="sm" icon={CheckCheck} onClick={markAllRead}>{t.notificationMarkAllRead}</Button> : undefined}
      />

      <div className="mb-5 flex items-center justify-between gap-3">
        <FilterChips options={options} value={filter} onChange={setFilter} label={t.notificationCenter} />
        {unread > 0 && <span className="hidden rounded-full bg-primary-tint px-3 py-1.5 text-caption font-semibold text-primary sm:inline-flex">{unread} {t.notificationUnread.toLowerCase()}</span>}
      </div>

      {loading ? <SkeletonRows rows={5} /> : error ? (
        <Card className="text-center">
          <p className="text-body text-ink-muted">{t.notificationLoadError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => { setLoading(true); void refresh(); }}>{t.notificationRetry}</Button>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState icon={Bell} title={filter === "unread" ? t.notificationEmptyTitle : t.notificationEmptyTitle} body={t.notificationEmptyBody} />
      ) : (
        <div className="flex flex-col gap-5">
          {[
            { title: t.notificationToday, list: todayItems },
            { title: t.notificationEarlier, list: earlierItems },
          ].filter((group) => group.list.length > 0).map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 px-1 text-meta font-bold text-ink-muted">{group.title}</h2>
              <Card padded={false} as="ul" className="overflow-hidden">
                {group.list.map((item) => {
                  const Icon = typeIcon(item.type);
                  const when = formatDateParts(item.createdAt, locale);
                  return (
                    <li key={item.id} className={`group flex min-h-20 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:px-5 ${item.read ? "" : "bg-primary-tint/35"}`}>
                      <span className={`flex size-11 flex-none items-center justify-center rounded-xl ${item.type.startsWith("EM_") ? "bg-danger-tint text-danger" : item.type.startsWith("LF_") ? "bg-gold-tint text-gold-ink" : item.type.startsWith("CS_") ? "bg-reported-tint text-reported-ink" : "bg-primary-tint text-primary"}`}>
                        <Icon aria-hidden size={21} />
                      </span>
                      <Link href={targetFor(item)} onClick={() => void markRead(item)} className="flex min-w-0 flex-1 items-start gap-2 rounded-lg py-1 focus-visible:outline-primary">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-body leading-snug font-semibold text-ink">{tx(item.message)}</span>
                            {!item.read && <span className="size-2 flex-none rounded-full bg-primary" aria-label={t.notificationUnread} />}
                          </span>
                          <span className="mt-1 block text-caption text-ink-muted">{when.day} {when.month} · {when.time}</span>
                        </span>
                      </Link>
                      {!item.read && (
                      <button type="button" onClick={() => void markRead(item)} aria-label={t.notificationMarkRead} title={t.notificationMarkRead} className="flex size-12 flex-none items-center justify-center rounded-xl text-ink-muted hover:bg-sand-deep hover:text-primary">
                          <Check aria-hidden size={18} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
