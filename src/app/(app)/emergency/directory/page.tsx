"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Clock, Compass, Edit2, ExternalLink, MapPin, Navigation, Phone, Plus, Power, Search, Shield } from "lucide-react";
import { HotlineStrip, useLocations } from "@/features/emergency/meta";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows, Button, Card, CountBadge, PageHeader, Section, SelectField, Sheet, TextField } from "@/components/ui";
import type { EmOrgType, EmServiceFilter, EmServiceView } from "@/types";

export default function EmergencyDirectoryPage() {
  const { t, tx, locale } = useLocale();
  const { provinces: PROVINCES, cities: CITIES } = useLocations();
  const { user } = useAuth();

  // Pinned hotlines (Unverified, check before launch)

  // Directory services
  const [services, setServices] = useState<EmServiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedProvince, setSelectedProvince] = useState<string>(user?.provinceId || "phnom-penh");
  const [selectedCity, setSelectedCity] = useState<string>("");

  // Admin / Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentOrg, setCurrentOrg] = useState<EmServiceView | null>(null);
  const [editKmName, setEditKmName] = useState("");
  const [editEnName, setEditEnName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<EmOrgType>("POLICE");
  const [editProvince, setEditProvince] = useState("phnom-penh");
  const [editCity, setEditCity] = useState("doun-penh");
  const [isSaving, startTransition] = useTransition();

  const isAdmin = user?.role === "ADMIN";
  const isOrgStaff = user?.role === "ORGANIZATION";

  async function loadDirectory() {
    try {
      setLoading(true);
      setError(null);
      const filter: EmServiceFilter = {
        includeDeactivated: isAdmin, // Admins can view deactivated entries to reactivate them
      };
      if (selectedType !== "ALL") filter.type = [selectedType as EmOrgType];
      if (selectedProvince) filter.provinceId = selectedProvince;
      if (selectedCity) filter.cityId = selectedCity;

      const list = await api.em.listServices(filter);
      setServices(list);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      setError(err?.message || t.errGeneric);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const deferred = setTimeout(() => {
      }, 0);
    return () => clearTimeout(deferred);
  }, []);

  useEffect(() => {
    const deferred = setTimeout(loadDirectory, 0);
    return () => clearTimeout(deferred);
  }, [selectedType, selectedProvince, selectedCity, isAdmin]);

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.km.toLowerCase().includes(q) ||
      s.name.en.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  const getOrgTypeLabel = (type: string) => {
    switch (type) {
      case "POLICE":
        return t.servicePolice;
      case "HOSPITAL":
        return t.serviceHospital;
      case "AMBULANCE":
        return t.serviceAmbulance;
      case "FIRE":
        return t.serviceFire;
      case "RESCUE":
        return t.serviceRescue;
      default:
        return type;
    }
  };

  const handleOpenEdit = (s: EmServiceView) => {
    setCurrentOrg(s);
    setEditKmName(s.name.km);
    setEditEnName(s.name.en);
    setEditPhone(s.phone);
    setEditAddress(s.address);
    setEditType(s.type);
    setEditProvince(s.provinceId);
    setEditCity(s.cityId);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    startTransition(async () => {
      try {
        await api.em.updateService(currentOrg.id, {
          name: { km: editKmName.trim(), en: editEnName.trim() },
          phone: editPhone.trim(),
          address: editAddress.trim(),
        });
        setIsEditOpen(false);
        await loadDirectory();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        alert(err?.message || "Failed to update service");
      }
    });
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await api.em.createService({
          type: editType,
          name: { km: editKmName.trim(), en: editEnName.trim() },
          phone: editPhone.trim(),
          address: editAddress.trim(),
          provinceId: editProvince,
          cityId: editCity,
          location: { lat: 11.5564, lng: 104.9282 },
        });
        setIsCreateOpen(false);
        await loadDirectory();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        alert(err?.message || "Failed to create service");
      }
    });
  };

  const handleToggleActive = (s: EmServiceView) => {
    const actionName = s.active ? t.deactivate : t.reactivate;
    if (!window.confirm(`${actionName} "${tx(s.name)}"?`)) return;
    startTransition(async () => {
      try {
        await api.em.deactivateService(s.id, !s.active);
        await loadDirectory();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        alert(err?.message || "Action failed");
      }
    });
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        <PageHeader
          title={t.emergencyDirectoryTitle}
          subtitle={t.emergencyDirectorySubtitle}
          back="/emergency"
          actions={
            isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditKmName("");
                  setEditEnName("");
                  setEditPhone("");
                  setEditAddress("");
                  setEditType("POLICE");
                  setEditProvince("phnom-penh");
                  setEditCity("doun-penh");
                  setIsCreateOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus size={16} />
                <span>{t.addNewService}</span>
              </Button>
            )
          }
        />

        {/* Directions vs Direct Call Offline Note */}
        <p className="rounded-xl border border-line bg-surface p-3 text-caption text-ink-muted">
          {t.directionsOfflineNote}
        </p>

        <HotlineStrip />

        {/* QUICK LINK TO NEARBY GPS VIEW */}
        <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary-ink">
              <Navigation size={20} />
            </div>
            <div>
              <p className="font-bold text-ink">{t.nearbyServicesPageTitle}</p>
              <p className="text-meta text-ink-muted">{t.nearbyServicesPageSubtitle}</p>
            </div>
          </div>
          <Link
            href="/emergency/nearby"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-meta font-bold text-white shadow-card hover:bg-primary-hover"
          >
            <span>{locale === "km" ? "មើលតាមចម្ងាយ GPS" : "View by Distance"}</span>
            <ExternalLink size={14} />
          </Link>
        </div>

        {/* 2. DIRECTORY FILTERS & SEARCH */}
        <Card className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-body text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Area Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedCity("");
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-meta font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t.allProvinces}</option>
                {PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {tx(p.name)}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedProvince}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-meta font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">{t.allCities}</option>
                {CITIES.filter((c) => !selectedProvince || c.provinceId === selectedProvince).map((c) => (
                  <option key={c.id} value={c.id}>
                    {tx(c.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Org Type Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {[
              { id: "ALL", label: t.allServices },
              { id: "POLICE", label: t.servicePolice },
              { id: "HOSPITAL", label: t.serviceHospital },
              { id: "AMBULANCE", label: t.serviceAmbulance },
              { id: "FIRE", label: t.serviceFire },
              { id: "RESCUE", label: t.serviceRescue },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`rounded-xl px-4 py-1.5 text-meta font-semibold transition-colors ${
                  selectedType === tab.id
                    ? "bg-primary text-white shadow-card"
                    : "bg-surface text-ink hover:bg-sand"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* 3. DIRECTORY ENTRIES LIST */}
        <Section
          title={t.emergencyDirectoryTitle}
          action={<CountBadge count={filteredServices.length} />}
        >
          {loading ? (
            <SkeletonRows rows={4} />
          ) : filteredServices.length === 0 ? (
            <Card className="py-12 text-center text-ink-muted">
              {locale === "km" ? "រកមិនឃើញសេវាសង្គ្រោះបន្ទាន់ទេ" : "No emergency services found"}
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredServices.map((s) => {
                const canEdit = isAdmin || (isOrgStaff && user?.organizationId === s.id);
                return (
                  <Card
                    key={s.id}
                    className={`flex flex-col justify-between p-5 transition-all hover:border-primary/40 hover:shadow-card ${
                      !s.active ? "opacity-60 bg-sand/30 border-dashed" : ""
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-row font-bold text-ink leading-snug">
                            {tx(s.name)}
                          </h3>
                          <span className="mt-1 inline-block rounded-md bg-sand px-2 py-0.5 text-caption font-semibold text-ink">
                            {getOrgTypeLabel(s.type)}
                          </span>
                        </div>
                        {!s.active && (
                          <span className="rounded bg-danger-tint px-2 py-0.5 text-caption font-bold text-danger-ink border border-danger/30">
                            {t.deactivated}
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      <p className="mt-3 flex items-start gap-1.5 text-meta text-ink-muted">
                        <MapPin size={15} className="mt-0.5 flex-none text-primary-ink" />
                        <span>{s.address}</span>
                      </p>

                      {/* Operating Hours & Verified Date */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-ink-muted">
                        <div className="flex items-center gap-1 font-medium text-fixed-ink">
                          <Clock size={13} />
                          <span>{t.open24Hours}</span>
                        </div>
                        {s.lastVerified ? (
                          <div className="flex items-center gap-1 opacity-80">
                            <Shield size={12} />
                            <span>
                              {t.lastVerified}: {s.lastVerified.slice(0, 10)}
                            </span>
                          </div>
                        ) : null}
                        {s.pendingReview && (
                          <span className="rounded bg-reported-tint px-2 py-0.5 text-caption font-bold text-reported-ink border border-reported/30">
                            {t.pendingAdminReview}
                          </span>
                        )}
                        {s.isStaleVerified && !s.pendingReview && (
                          <span className="rounded bg-reported-tint px-2 py-0.5 text-caption font-bold text-reported-ink border border-reported/30">
                            {t.lastVerifiedStaleWarning}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 border-t border-line pt-3.5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        {/* Mock Phone Number with Sample Data Badge */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-meta font-bold text-ink">
                            {s.phone}
                          </span>
                          <span className="text-caption bg-reported-tint text-reported-ink px-1.5 py-0.5 rounded border border-reported/30">
                            {t.sampleDataBadge}
                          </span>
                        </div>

                        {/* Admin / Org Controls */}
                        {canEdit && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(s)}
                              className="text-primary-ink hover:bg-primary-tint px-2"
                              title={t.editService}
                            >
                              <Edit2 size={15} />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(s)}
                                className={s.active ? "text-danger hover:bg-danger-tint px-2" : "text-fixed-ink px-2"}
                                title={s.active ? t.deactivate : t.reactivate}
                              >
                                <Power size={15} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Call Now and Directions Buttons */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${s.phone}`}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-danger py-2 text-meta font-bold text-white shadow-card hover:bg-danger-hover transition-colors"
                        >
                          <Phone size={15} />
                          <span>{t.callNow}</span>
                        </a>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${s.location.lat},${s.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-meta font-bold text-ink hover:bg-sand transition-colors"
                        >
                          <Compass size={15} className="text-primary-ink" />
                          <span>{t.directions}</span>
                        </a>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Edit Service Modal */}
      {isEditOpen && currentOrg && (
        <Sheet title={t.editService} onClose={() => setIsEditOpen(false)}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <TextField
              label={locale === "km" ? "ឈ្មោះស្ថាប័ន (ភាសាខ្មែរ)" : "Name (Khmer)"}
              value={editKmName}
              onChange={(e) => setEditKmName(e.target.value)}
              required
            />
            <TextField
              label={locale === "km" ? "ឈ្មោះស្ថាប័ន (ភាសាអង់គ្លេស)" : "Name (English)"}
              value={editEnName}
              onChange={(e) => setEditEnName(e.target.value)}
              required
            />
            <TextField
              label={locale === "km" ? "លេខទូរស័ព្ទ" : "Phone"}
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
            />
            <TextField
              label={locale === "km" ? "អាសយដ្ឋាន" : "Address"}
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                {t.close}
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? t.submitting : t.save}
              </Button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Admin Add Service Modal */}
      {isCreateOpen && (
        <Sheet title={t.addNewService} onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreateService} className="space-y-4">
            <SelectField
              label={locale === "km" ? "ប្រភេទស្ថាប័ន" : "Service Type"}
              value={editType}
              onChange={(e) => setEditType(e.target.value as EmOrgType)}
            >
              <option value="POLICE">{t.servicePolice}</option>
              <option value="HOSPITAL">{t.serviceHospital}</option>
              <option value="AMBULANCE">{t.serviceAmbulance}</option>
              <option value="FIRE">{t.serviceFire}</option>
              <option value="RESCUE">{t.serviceRescue}</option>
            </SelectField>

            <TextField
              label={locale === "km" ? "ឈ្មោះស្ថាប័ន (ភាសាខ្មែរ)" : "Name (Khmer)"}
              value={editKmName}
              onChange={(e) => setEditKmName(e.target.value)}
              required
            />
            <TextField
              label={locale === "km" ? "ឈ្មោះស្ថាប័ន (ភាសាអង់គ្លេស)" : "Name (English)"}
              value={editEnName}
              onChange={(e) => setEditEnName(e.target.value)}
              required
            />
            <TextField
              label={locale === "km" ? "លេខទូរស័ព្ទ" : "Phone"}
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="e.g. 023 000 304"
              required
            />
            <TextField
              label={locale === "km" ? "អាសយដ្ឋាន" : "Address"}
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={locale === "km" ? "ខេត្ត/រាជធានី" : "Province"}
                value={editProvince}
                onChange={(e) => setEditProvince(e.target.value)}
              >
                {PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {tx(p.name)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label={locale === "km" ? "ក្រុង/ស្រុក/ខណ្ឌ" : "City/Khan"}
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              >
                {CITIES.filter((c) => c.provinceId === editProvince).map((c) => (
                  <option key={c.id} value={c.id}>
                    {tx(c.name)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                {t.close}
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? t.submitting : t.save}
              </Button>
            </div>
          </form>
        </Sheet>
      )}
    </PageContainer>
  );
}
