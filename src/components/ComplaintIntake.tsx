import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Camera,
  Check,
  CheckCircle2,
  CloudSun,
  Crosshair,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { IncidentMap } from './IncidentMap';
import { CategorySvgIcon, getCategoryIconKey } from './CategoryIcons';
import { TRANSLATIONS, type LanguageCode } from '../i18n';
import {
  OVERLAPPING_CATEGORIES,
  ROAD_CLOSURES,
  SAN_MATEO_BARANGAYS,
  STATUS_STEPS,
  type AiAnalysis,
  type IncidentReport,
  type LguDepartment,
  type ReportCategory,
  type ReportClass,
  type User,
} from '../types/report';

export interface PendingComplaintDraft {
  reportClass: ReportClass;
  category: ReportCategory;
  title: string;
  description: string;
  mediaDataUrl: string;
  mediaName: string;
  lat: number;
  lng: number;
  addressLabel: string;
  barangay: string;
  assignedDepartment?: LguDepartment;
  aiAnalysis?: AiAnalysis;
}

interface ComplaintIntakeProps {
  user: User | null;
  token: string | null;
  lang: LanguageCode;
  reports: IncidentReport[];
  forceGuidedMode?: boolean;
  onConsumeForceGuidedMode?: () => void;
  pendingDraftToSubmit: PendingComplaintDraft | null;
  onClearPendingDraft: () => void;
  onRequireAuth: (draft: PendingComplaintDraft) => void;
  onReportSubmitted: (report: IncidentReport) => void;
  onNavigateToStatus: (reportId?: string) => void;
  onNavigateToMap: (reportId?: string) => void;
  onNavigateToHotlines: () => void;
  isMobileView?: boolean;
}

const DEFAULT_LAT = 14.6967;
const DEFAULT_LNG = 121.1219;

interface GuidedChatMsg {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
}

function getProgressPercent(status: IncidentReport['status']): number {
  switch (status) {
    case 'submitted':
      return 20;
    case 'triaged':
      return 45;
    case 'assigned':
      return 70;
    case 'in_progress':
      return 85;
    case 'resolved':
      return 100;
  }
}

export const ComplaintIntake: React.FC<ComplaintIntakeProps> = ({
  user,
  token,
  lang,
  reports,
  forceGuidedMode,
  onConsumeForceGuidedMode,
  pendingDraftToSubmit,
  onClearPendingDraft,
  onRequireAuth,
  onReportSubmitted,
  onNavigateToStatus,
  onNavigateToMap,
  onNavigateToHotlines,
  isMobileView = false,
}) => {
  const t = TRANSLATIONS[lang];

  // Sequential 3-step state
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('Trash & Collection');
  const [reportClass, setReportClass] = useState<ReportClass>('non_hazard');
  const [assignedDept, setAssignedDept] = useState<LguDepartment>(
    'San Mateo Solid Waste & Sanitation'
  );
  const [description, setDescription] = useState('');
  const [mediaDataUrl, setMediaDataUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaName, setMediaName] = useState('');

  // Step 2: Pin & Barangay
  const [lat, setLat] = useState<number>(DEFAULT_LAT);
  const [lng, setLng] = useState<number>(DEFAULT_LNG);
  const [addressLabel, setAddressLabel] = useState<string>(
    'Gen. Luna Ave., Guitnang Bayan I, San Mateo, Rizal'
  );
  const [barangay, setBarangay] = useState<string>(user?.barangay || SAN_MATEO_BARANGAYS[0]);
  const [locatingGps, setLocatingGps] = useState(false);

  // AI & Guided Chat
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedInput, setGuidedInput] = useState('');
  const [guidedLoading, setGuidedLoading] = useState(false);
  const [guidedMessages, setGuidedMessages] = useState<GuidedChatMsg[]>([
    {
      id: 'g0',
      sender: 'assistant',
      text:
        lang === 'tl'
          ? 'Ilarawan ang isyu sa inyong lugar sa San Mateo at awtomatiko ko itong ikakategorya.'
          : 'Describe the issue in your San Mateo neighborhood and I will auto-categorize and route it.',
    },
  ]);

  // Search & Tracking Preview
  const [searchQuery, setSearchQuery] = useState('');
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedBanner, setSubmittedBanner] = useState<IncidentReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stepperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (forceGuidedMode) {
      setGuidedMode(true);
      onConsumeForceGuidedMode?.();
      stepperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [forceGuidedMode, onConsumeForceGuidedMode]);

  useEffect(() => {
    if (user?.barangay) setBarangay(user.barangay);
  }, [user]);

  useEffect(() => {
    if (!previewReportId && reports.length > 0) {
      setPreviewReportId(reports[0].id);
    }
  }, [reports, previewReportId]);

  const handleSelectOverlappingCategory = (cat: (typeof OVERLAPPING_CATEGORIES)[number]) => {
    setSelectedCategory(cat.label);
    setReportClass(cat.reportClass);
    setAssignedDept(cat.defaultDept);
    setActiveStep(1);
    stepperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Search results dropdown (reports + active road closures)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { matchingReports: [], matchingClosures: [] };
    const matchingReports = reports
      .filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.addressLabel.toLowerCase().includes(q) ||
          r.barangay.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      )
      .slice(0, 4);
    const matchingClosures = ROAD_CLOSURES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.street.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    ).slice(0, 2);
    return { matchingReports, matchingClosures };
  }, [searchQuery, reports]);

  const reverseGeocode = async (nextLat: number, nextLng: number) => {
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${nextLat}&lng=${nextLng}`);
      if (!res.ok) return;
      const data = (await res.json()) as { addressLabel?: string; barangay?: string };
      if (data.addressLabel) setAddressLabel(data.addressLabel);
      if (data.barangay) {
        const matched = SAN_MATEO_BARANGAYS.find((b) =>
          data.barangay!.toLowerCase().includes(b.toLowerCase())
        );
        if (matched) setBarangay(matched);
      }
    } catch {
      // Keep existing address label
    }
  };

  const handleMapSelect = (nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    void reverseGeocode(nextLat, nextLng);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported in this browser. Tap the map to pin.');
      return;
    }
    setLocatingGps(true);
    setSubmitError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        handleMapSelect(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocatingGps(false);
        setSubmitError('GPS permission unavailable. Tap or drag the pin on the San Mateo map.');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 11 * 1024 * 1024) {
      setSubmitError('File exceeds 11MB limit. Please choose a smaller photo or short clip.');
      return;
    }
    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setMediaDataUrl(result);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      setMediaName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleAiAutoCategorize = async () => {
    if (!description.trim() && !mediaDataUrl) {
      setSubmitError('Add a photo or short note first for AI Auto-Categorize.');
      return;
    }
    setAnalyzing(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || `${selectedCategory} at ${addressLabel}`,
          lat,
          lng,
          mediaDataUrl: mediaType === 'image' ? mediaDataUrl : undefined,
          preferredClass: reportClass,
        }),
      });
      if (!res.ok) throw new Error('AI analysis unavailable');
      const data = (await res.json()) as { analysis: AiAnalysis };
      setAiAnalysis(data.analysis);
      setSelectedCategory(data.analysis.suggestedCategory);
      setReportClass(data.analysis.suggestedClass);
      setAssignedDept(data.analysis.suggestedDepartment);
    } catch {
      setSubmitError('Unable to run AI Auto-Categorize right now.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGuidedSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guidedInput.trim();
    if (!trimmed || guidedLoading) return;
    const nextUserMsg: GuidedChatMsg = { id: `u_${Date.now()}`, sender: 'user', text: trimmed };
    setGuidedMessages((prev) => [...prev, nextUserMsg]);
    setGuidedInput('');
    setGuidedLoading(true);
    try {
      const res = await fetch('/api/ai/guided-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: guidedMessages.map((m) => ({ role: m.sender, text: m.text })),
          lat,
          lng,
          lang,
        }),
      });
      const data = (await res.json()) as {
        reply: string;
        draftUpdate?: {
          reportClass: ReportClass;
          category: ReportCategory;
          assignedDepartment: LguDepartment;
          title: string;
          description: string;
          aiAnalysis?: AiAnalysis;
        };
      };
      setGuidedMessages((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, sender: 'assistant', text: data.reply },
      ]);
      if (data.draftUpdate) {
        setSelectedCategory(data.draftUpdate.category);
        setReportClass(data.draftUpdate.reportClass);
        setAssignedDept(data.draftUpdate.assignedDepartment);
        setDescription(data.draftUpdate.description);
        if (data.draftUpdate.aiAnalysis) setAiAnalysis(data.draftUpdate.aiAnalysis);
      }
    } catch {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          sender: 'assistant',
          text: 'Draft saved locally. Attach your photo and confirm the San Mateo map pin.',
        },
      ]);
    } finally {
      setGuidedLoading(false);
    }
  };

  const submitDraftPayload = async (draft: PendingComplaintDraft, authToken: string) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { report?: IncidentReport; error?: string };
      if (!res.ok || !data.report) {
        throw new Error(data.error || 'Submission failed.');
      }
      onReportSubmitted(data.report);
      setSubmittedBanner(data.report);
      setPreviewReportId(data.report.id);
      setDescription('');
      setMediaDataUrl('');
      setMediaName('');
      setAiAnalysis(null);
      setActiveStep(1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit pending draft after sign-in
  useEffect(() => {
    if (user && token && pendingDraftToSubmit) {
      const draft = pendingDraftToSubmit;
      onClearPendingDraft();
      void submitDraftPayload(draft, token);
    }
  }, [user, token, pendingDraftToSubmit]);

  const handleFinalSubmit = () => {
    if (!mediaDataUrl) {
      setActiveStep(1);
      setSubmitError('Attach a photo or short video in Step 1 before submitting.');
      return;
    }
    const cleanTitle =
      description.trim().slice(0, 72) || `${selectedCategory} at ${barangay}, San Mateo`;
    const draft: PendingComplaintDraft = {
      reportClass,
      category: selectedCategory,
      title: cleanTitle,
      description:
        description.trim() || `${selectedCategory} reported near ${addressLabel} (${barangay}).`,
      mediaDataUrl,
      mediaName: mediaName || 'evidence.jpg',
      lat,
      lng,
      addressLabel,
      barangay,
      assignedDepartment: assignedDept,
      aiAnalysis: aiAnalysis || undefined,
    };

    if (!user || !token) {
      onRequireAuth(draft);
      return;
    }
    void submitDraftPayload(draft, token);
  };

  const previewReport = useMemo(
    () => reports.find((r) => r.id === previewReportId) || reports[0] || null,
    [reports, previewReportId]
  );

  const previewStepIdx = previewReport
    ? STATUS_STEPS.findIndex((s) => s.key === previewReport.status)
    : 0;

  return (
    <div className="w-full">
      {/* ============================================================
          BAND 1: HERO BANNER (#145EC1 to #154792) + LOWER WEATHER STRIP
      ============================================================ */}
      <section
        className={`relative bg-gradient-to-br from-[#145EC1] via-[#154792] to-[#0F3470] text-white ${
          isMobileView ? 'pt-6 pb-16' : 'pt-7 sm:pt-12 pb-16 sm:pb-24'
        } overflow-hidden`}
      >
        {/* Subtle San Mateo cityscape & Sierra Madre SVG silhouette */}
        <svg
          className="pointer-events-none absolute right-0 bottom-0 h-full w-full lg:w-3/5 opacity-15"
          viewBox="0 0 800 320"
          preserveAspectRatio="xMaxYMax slice"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M40 320 L160 190 L260 250 L390 140 L520 230 L660 110 L800 200 L800 320 Z"
            fill="#5EABF0"
          />
          <rect x="440" y="185" width="44" height="135" rx="4" fill="#FEFFFE" />
          <rect x="498" y="155" width="58" height="165" rx="4" fill="#FBE95C" fillOpacity="0.65" />
          <rect x="570" y="200" width="48" height="120" rx="4" fill="#FEFFFE" />
          <rect x="632" y="170" width="52" height="150" rx="4" fill="#5EABF0" />
          <rect x="698" y="210" width="60" height="110" rx="4" fill="#FEFFFE" />
        </svg>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6">
          <div className="max-w-3xl space-y-3 sm:space-y-4">
            <h1
              className={`font-display ${
                isMobileView
                  ? 'text-2xl leading-tight'
                  : 'text-2xl sm:text-4xl lg:text-[42px] leading-[1.12]'
              } font-extrabold tracking-tight text-white text-balance`}
            >
              {t.heroHeadline}
            </h1>

            {/* Prominent Rounded Search Bar */}
            <div className="relative max-w-2xl">
              <div className="flex items-center bg-[#FEFFFE] rounded-full p-1.5 shadow-xl shadow-[#0b2757]/30 border border-white/30">
                <Search className="w-5 h-5 text-[#1177F0] ml-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm text-[#154792] placeholder-[#4679C0]/75 bg-transparent focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-[#4679C0] hover:text-[#154792]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateToStatus(searchResults.matchingReports[0]?.id)}
                  className="px-5 py-2.5 rounded-full bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors"
                >
                  Track ID
                </button>
              </div>

              {/* Instant Search Dropdown */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-[#FEFFFE] rounded-2xl shadow-2xl border border-[#d6e4f7] overflow-hidden z-30 text-[#154792]">
                  {searchResults.matchingReports.length === 0 &&
                  searchResults.matchingClosures.length === 0 ? (
                    <div className="px-4 py-3 text-xs font-medium text-[#4679C0]">
                      No matching San Mateo reports or road closures.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F3F7FD]">
                      {searchResults.matchingReports.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            onNavigateToStatus(r.id);
                          }}
                          className="w-full px-4 py-3 hover:bg-[#F3F7FD] flex items-center justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#1177F0] tabular-nums">
                                {r.id}
                              </span>
                              <span className="text-xs font-bold truncate">{r.title}</span>
                            </div>
                            <div className="text-[11px] text-[#4679C0] truncate">
                              {r.addressLabel}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#FBE95C] text-[#154792] text-[10px] font-extrabold uppercase shrink-0">
                            {r.status.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                      {searchResults.matchingClosures.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            onNavigateToMap();
                          }}
                          className="w-full px-4 py-3 hover:bg-[#F3F7FD] flex items-center justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#154792]">{c.title}</span>
                            <div className="text-[11px] text-[#4679C0]">
                              {c.street} · {c.schedule}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#F3F7FD] text-[#1177F0] text-[10px] font-extrabold shrink-0">
                            ROAD CLOSURE
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Compact Local Weather & Advisory Strip inside lower Hero */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onNavigateToHotlines}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#154792]/80 hover:bg-[#154792] border border-[#5EABF0]/40 text-xs font-semibold text-white transition-colors"
            >
              <CloudSun className="w-4 h-4 text-[#FBE95C] shrink-0" />
              <span className="tabular-nums">{t.weatherAdvisory}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          6 OVERLAPPING HORIZONTAL CATEGORY CARDS (ON #FEFFFE BAND)
      ============================================================ */}
      <section className="bg-[#FEFFFE] pb-7 sm:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 sm:-mt-12 relative z-20">
          <div
            className={`grid ${
              isMobileView
                ? 'grid-cols-2 gap-2.5'
                : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5'
            }`}
          >
            {OVERLAPPING_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleSelectOverlappingCategory(cat)}
                  className={`group bg-[#FEFFFE] rounded-2xl ${
                    isMobileView ? 'p-3 gap-2' : 'p-3.5 sm:p-4 gap-2.5 sm:gap-3'
                  } text-left transition-all shadow-lg shadow-[#154792]/8 flex flex-col items-start justify-between border ${
                    active
                      ? 'border-[#1177F0] border-b-4 border-b-[#FBE95C] -translate-y-0.5'
                      : 'border-[#dce7f7] hover:border-[#5EABF0] hover:-translate-y-0.5'
                  }`}
                >
                  <CategorySvgIcon
                    iconKey={cat.iconKey}
                    className={isMobileView ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'}
                  />
                  <span className="text-xs sm:text-[13px] font-bold text-[#154792] leading-snug">
                    {lang === 'tl' ? cat.tlTitle : cat.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          BAND 2: GUIDED SEQUENTIAL 3-STEP REPORTING WORKFLOW (#F3F7FD)
      ============================================================ */}
      <section
        id="report-stepper"
        ref={stepperRef}
        className={`bg-[#F3F7FD] ${
          isMobileView ? 'py-6' : 'py-8 sm:py-12'
        } border-y border-[#dde8f7]`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-6">
          {/* Submission confirmation */}
          {submittedBanner && (
            <div className="bg-[#FEFFFE] border-2 border-[#1177F0] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBE95C] text-[#154792] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#154792]">
                    Report Logged ·{' '}
                    <span className="font-mono text-[#1177F0] tabular-nums">
                      {submittedBanner.id}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#4679C0]">
                    {submittedBanner.assignedDepartment} · {submittedBanner.barangay}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToStatus(submittedBanner.id)}
                className="px-4 py-2 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-xs font-bold whitespace-nowrap"
              >
                Track Live Status
              </button>
            </div>
          )}

          {/* Top 3-Step Progress Tracker & AI Guided Chat Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(
                [
                  { step: 1 as const, num: '01', label: t.step1Label },
                  { step: 2 as const, num: '02', label: t.step2Label },
                  { step: 3 as const, num: '03', label: t.step3Label },
                ] as const
              ).map((item, idx) => {
                const completed = activeStep > item.step;
                const active = activeStep === item.step;
                return (
                  <React.Fragment key={item.step}>
                    <button
                      type="button"
                      onClick={() => {
                        setGuidedMode(false);
                        setActiveStep(item.step);
                      }}
                      className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#FBE95C] text-[#154792] shadow-sm'
                          : completed
                            ? 'bg-[#1177F0] text-white'
                            : 'bg-[#FEFFFE] text-[#4679C0] border border-[#d6e4f7]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold tabular-nums ${
                          active
                            ? 'bg-[#154792] text-[#FBE95C]'
                            : completed
                              ? 'bg-white text-[#1177F0]'
                              : 'bg-[#F3F7FD] text-[#154792]'
                        }`}
                      >
                        {completed ? <Check className="w-3.5 h-3.5" /> : item.num}
                      </span>
                      <span>{item.label}</span>
                    </button>
                    {idx < 2 && <div className="hidden sm:block w-5 h-0.5 bg-[#c9dbf4]" />}
                  </React.Fragment>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setGuidedMode((v) => !v)}
              className={`self-start lg:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                guidedMode
                  ? 'bg-[#154792] text-[#FBE95C] border-[#154792]'
                  : 'bg-[#FEFFFE] text-[#154792] border-[#c8daf3] hover:border-[#1177F0]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {guidedMode ? t.standardFormLabel : t.guidedChatLabel}
            </button>
          </div>

          {submitError && (
            <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              {submitError}
            </div>
          )}

          {/* Split Workspace: Left Guided Form/Chat + Right Persistent San Mateo Map */}
          <div
            className={`grid grid-cols-1 ${
              isMobileView ? '' : 'lg:grid-cols-12'
            } gap-5 sm:gap-6 items-stretch`}
          >
            {/* LEFT PANEL (7 cols) */}
            <div
              className={`${
                isMobileView ? 'p-4' : 'lg:col-span-7 p-5 sm:p-7'
              } bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] shadow-sm flex flex-col justify-between`}
            >
              {guidedMode ? (
                <div className="flex flex-col h-full min-h-[420px] justify-between space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#eef4fc]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#1177F0] text-white flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#154792]">
                          AI Guided Intake
                        </h3>
                        <span className="text-[11px] font-bold text-[#1177F0]">
                          {selectedCategory} · {barangay}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGuidedMode(false);
                        setActiveStep(mediaDataUrl ? 2 : 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FBE95C] text-[#154792] text-xs font-bold whitespace-nowrap"
                    >
                      Attach &amp; Review
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[280px] pr-1">
                    {guidedMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${
                            m.sender === 'user'
                              ? 'bg-[#1177F0] text-white'
                              : 'bg-[#F3F7FD] text-[#154792]'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {guidedLoading && (
                      <div className="text-xs font-semibold text-[#4679C0]">Analyzing...</div>
                    )}
                  </div>

                  <form onSubmit={handleGuidedSend} className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={guidedInput}
                      onChange={(e) => setGuidedInput(e.target.value)}
                      placeholder="e.g., Broken water pipe along Gen. Luna Ave..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#F3F7FD] border border-[#d6e4f7] text-xs font-medium text-[#154792] focus:outline-none focus:ring-2 focus:ring-[#1177F0]"
                    />
                    <button
                      type="submit"
                      disabled={guidedLoading || !guidedInput.trim()}
                      className="p-2.5 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] disabled:opacity-50 text-white"
                      aria-label="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* STEP 1: Evidence & Category */}
                  {activeStep === 1 && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                          <CategorySvgIcon
                            iconKey={getCategoryIconKey(selectedCategory)}
                            className="w-8 h-8"
                          />
                          <h2 className="text-lg font-extrabold text-[#154792]">
                            {selectedCategory}
                          </h2>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-[#F3F7FD] text-[#1177F0] text-[11px] font-bold">
                          {assignedDept}
                        </span>
                      </div>

                      {/* Large Camera/Photo & Video Dropzone */}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          capture="environment"
                          onChange={(e) => handleFileChange(e.target.files?.[0])}
                          className="hidden"
                        />

                        {!mediaDataUrl ? (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                fileInputRef.current?.click();
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleFileChange(e.dataTransfer.files?.[0]);
                            }}
                            className="rounded-2xl border-2 border-dashed border-[#5EABF0] bg-[#F3F7FD] hover:bg-[#e8f1fc] transition-colors p-8 text-center cursor-pointer space-y-3"
                          >
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#1177F0] text-white flex items-center justify-center shadow-sm">
                              <Camera className="w-6 h-6" />
                            </div>
                            <div className="text-sm font-extrabold text-[#154792]">
                              {t.evidenceDropTitle}
                            </div>
                            <div className="text-[11px] font-semibold text-[#4679C0] flex items-center justify-center gap-2">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{t.evidenceDropHint}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative rounded-2xl overflow-hidden border border-[#d6e4f7] bg-[#154792]">
                            {mediaType === 'image' ? (
                              <img
                                src={mediaDataUrl}
                                alt={mediaName}
                                className="w-full h-52 object-cover"
                              />
                            ) : (
                              <div className="h-52 flex flex-col items-center justify-center text-white gap-2">
                                <Video className="w-8 h-8 text-[#FBE95C]" />
                                <span className="text-xs font-bold">{mediaName}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMediaDataUrl('');
                                setMediaName('');
                              }}
                              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#154792]/90 hover:bg-[#154792] text-white text-xs font-bold inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Replace
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Optional 1-line description + AI Auto-Categorize chip */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional quick note (e.g., Corner Gen. Luna & Patiis Rd.)"
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[#F3F7FD] border border-[#d6e4f7] text-sm font-medium text-[#154792] placeholder-[#4679C0]/70 focus:outline-none focus:ring-2 focus:ring-[#1177F0]"
                          />
                          <button
                            type="button"
                            onClick={handleAiAutoCategorize}
                            disabled={analyzing}
                            className="px-4 py-2.5 rounded-xl bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                          >
                            {analyzing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            {analyzing ? t.analyzing : t.autoCategorize}
                          </button>
                        </div>

                        {aiAnalysis && (
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#154792] bg-[#F3F7FD] px-3.5 py-2 rounded-xl">
                            <span className="px-2 py-0.5 rounded-full bg-[#1177F0] text-white text-[10px] font-bold">
                              AI {Math.round(aiAnalysis.confidence * 100)}%
                            </span>
                            <span>{aiAnalysis.suggestedDepartment}</span>
                            {aiAnalysis.duplicateOfId && (
                              <span className="px-2 py-0.5 rounded-full bg-[#FBE95C] text-[#154792] text-[10px] font-extrabold">
                                Similar to {aiAnalysis.duplicateOfId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!mediaDataUrl) {
                              setSubmitError('Please snap or upload a photo/video first.');
                              return;
                            }
                            setSubmitError(null);
                            setActiveStep(2);
                          }}
                          className="px-6 py-2.5 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-sm font-bold transition-colors"
                        >
                          {t.nextStep}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Pin Location */}
                  {activeStep === 2 && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-extrabold text-[#154792]">
                          02 · {t.step2Label}
                        </h2>
                        <button
                          type="button"
                          onClick={handleUseGps}
                          disabled={locatingGps}
                          className="px-4 py-2 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {locatingGps ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Crosshair className="w-3.5 h-3.5" />
                          )}
                          {locatingGps ? t.locating : t.useGps}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#154792] mb-1.5">
                            {t.barangayLabel}
                          </label>
                          <select
                            value={barangay}
                            onChange={(e) => setBarangay(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F3F7FD] border border-[#d6e4f7] text-sm font-semibold text-[#154792] focus:outline-none focus:ring-2 focus:ring-[#1177F0]"
                          >
                            {SAN_MATEO_BARANGAYS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#154792] mb-1.5">
                            GPS Coordinates
                          </label>
                          <div className="px-3.5 py-2.5 rounded-xl bg-[#F3F7FD] border border-[#d6e4f7] text-xs font-mono font-bold text-[#1177F0] tabular-nums">
                            {lat.toFixed(5)}, {lng.toFixed(5)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#154792] mb-1.5">
                          Pinned Street / Landmark
                        </label>
                        <input
                          type="text"
                          value={addressLabel}
                          onChange={(e) => setAddressLabel(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7FD] border border-[#d6e4f7] text-sm font-medium text-[#154792] focus:outline-none focus:ring-2 focus:ring-[#1177F0]"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="px-5 py-2.5 rounded-xl bg-[#F3F7FD] hover:bg-[#e3eefb] text-[#154792] text-sm font-bold"
                        >
                          {t.backStep}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveStep(3)}
                          className="px-6 py-2.5 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-sm font-bold"
                        >
                          {t.nextStep}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Review & Submit */}
                  {activeStep === 3 && (
                    <div className="space-y-5">
                      <h2 className="text-lg font-extrabold text-[#154792]">
                        03 · {t.step3Label}
                      </h2>

                      <div className="rounded-2xl bg-[#F3F7FD] border border-[#d6e4f7] p-4 flex flex-col sm:flex-row gap-4 items-start">
                        {mediaDataUrl && mediaType === 'image' ? (
                          <img
                            src={mediaDataUrl}
                            alt="Evidence preview"
                            className="w-full sm:w-32 h-28 object-cover rounded-xl border border-[#d6e4f7] shrink-0"
                          />
                        ) : (
                          <div className="w-full sm:w-32 h-28 rounded-xl bg-[#154792] text-white flex items-center justify-center shrink-0">
                            <FileText className="w-7 h-7 text-[#FBE95C]" />
                          </div>
                        )}

                        <div className="space-y-1.5 text-xs flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#FBE95C] text-[#154792] font-extrabold">
                              {selectedCategory}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#1177F0] text-white font-bold">
                              {barangay}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-[#154792] pt-1">
                            {addressLabel}
                          </div>
                          <div className="font-semibold text-[#4679C0]">{assignedDept}</div>
                          {description && (
                            <div className="text-[#154792]/80 truncate">{description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="px-5 py-2.5 rounded-xl bg-[#F3F7FD] hover:bg-[#e3eefb] text-[#154792] text-sm font-bold"
                        >
                          {t.backStep}
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleFinalSubmit}
                          className="px-7 py-3 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-md disabled:opacity-60"
                        >
                          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          {submitting ? t.submitting : t.submitReport}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RIGHT PANEL (5 cols): Persistent Live San Mateo Map */}
            <div
              className={`${
                isMobileView ? '' : 'lg:col-span-5'
              } bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-3.5 shadow-sm flex flex-col gap-3`}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#154792]">
                  <MapPin className="w-4 h-4 text-[#1177F0]" />
                  <span>San Mateo Live Map</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#1177F0] tabular-nums">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              </div>
              <div className={isMobileView ? 'h-[240px]' : 'flex-1 min-h-[280px] sm:min-h-[340px]'}>
                <IncidentMap
                  reports={reports}
                  mode="picker"
                  selectedLat={lat}
                  selectedLng={lng}
                  onSelectLocation={handleMapSelect}
                  showIncidents={true}
                  showClosures={true}
                  className={isMobileView ? 'h-full min-h-[240px]' : 'h-full min-h-[280px] sm:min-h-[340px]'}
                />
              </div>
              <div className="px-1 flex items-center justify-between text-[11px] font-semibold text-[#4679C0]">
                <span className="truncate">{addressLabel}</span>
                <span className="shrink-0 font-bold text-[#154792]">{barangay}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          BAND 3: PHOTO-FIRST FEED & VERTICAL TRACKING TIMELINE (#FEFFFE)
      ============================================================ */}
      <section className="bg-[#FEFFFE] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          {/* Header + Full Dashboard CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold text-[#154792] tracking-tight">
              {t.recentFeedTitle}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateToStatus(previewReport?.id)}
              className="px-4 py-2 rounded-xl bg-[#F3F7FD] hover:bg-[#e3eefb] text-[#1177F0] text-xs font-extrabold transition-colors"
            >
              {t.openDashboard}
            </button>
          </div>

          {/* Horizontal Row of Photo-First Cards (swipeable on mobile) */}
          <div
            className={
              isMobileView
                ? 'flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory'
                : 'grid grid-cols-1 md:grid-cols-3 gap-5'
            }
          >
            {reports.slice(0, 3).map((report) => {
              const isResolved = report.status === 'resolved';
              const pct = getProgressPercent(report.status);
              const selected = previewReport?.id === report.id;
              return (
                <article
                  key={report.id}
                  onClick={() => setPreviewReportId(report.id)}
                  className={`${
                    isMobileView ? 'min-w-[270px] snap-start shrink-0' : ''
                  } cursor-pointer bg-[#FEFFFE] rounded-2xl overflow-hidden border transition-all shadow-sm hover:shadow-md ${
                    selected ? 'border-[#1177F0] ring-2 ring-[#1177F0]/20' : 'border-[#d6e4f7]'
                  }`}
                >
                  <div className="relative h-44 bg-[#F3F7FD]">
                    {report.mediaType === 'image' ? (
                      <img
                        src={report.mediaUrl}
                        alt={report.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#154792] flex items-center justify-center text-white">
                        <Video className="w-8 h-8 text-[#FBE95C]" />
                      </div>
                    )}
                    {/* Corner Ribbon: #FBE95C ACKNOWLEDGED or #1177F0 RESOLVED */}
                    <span
                      className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide shadow-sm ${
                        isResolved
                          ? 'bg-[#1177F0] text-white'
                          : 'bg-[#FBE95C] text-[#154792]'
                      }`}
                    >
                      {isResolved ? t.resolvedTag : t.acknowledgedTag}
                    </span>
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-[#154792]/90 text-white font-mono text-[10px] font-bold tabular-nums">
                      {report.id}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#154792] line-clamp-1">
                        {report.category}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4679C0] mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#1177F0] shrink-0" />
                        <span className="truncate">{report.addressLabel}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#154792]">
                        <span>{report.barangay}</span>
                        <span className="tabular-nums text-[#1177F0]">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F3F7FD] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isResolved ? 'bg-[#1177F0]' : 'bg-[#FBE95C]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Vertical Milestone Timeline Preview Card */}
          {previewReport && (
            <div
              className={`bg-[#F3F7FD] rounded-2xl border border-[#d6e4f7] ${
                isMobileView ? 'p-4 gap-5 grid-cols-1' : 'p-5 sm:p-8 grid-cols-1 lg:grid-cols-12 gap-8'
              } grid items-start`}
            >
              {/* Left: Vertical Milestone Nodes */}
              <div className={`${isMobileView ? '' : 'lg:col-span-7'} space-y-5`}>
                <h3 className="font-display text-lg font-extrabold text-[#154792]">
                  {t.liveTrackingTitle}
                </h3>
                <div className="relative pl-10 space-y-5">
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-[#c9dcf6]" />
                  {STATUS_STEPS.filter((s) => s.key !== 'in_progress').map((step, idx) => {
                    const stepRank = STATUS_STEPS.findIndex((s) => s.key === step.key);
                    const reached = previewStepIdx >= stepRank;
                    const isCurrent =
                      previewStepIdx === stepRank ||
                      (previewReport.status === 'in_progress' && step.key === 'assigned');
                    const timelineMatch = [...previewReport.timeline]
                      .reverse()
                      .find((entry) => entry.status === step.key);

                    return (
                      <div key={step.key} className="relative flex items-start gap-3">
                        <div
                          className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 ${
                            reached
                              ? isCurrent && previewReport.status !== 'resolved'
                                ? 'bg-[#FBE95C] border-[#154792] text-[#154792]'
                                : 'bg-[#1177F0] border-[#1177F0] text-white'
                              : 'bg-[#FEFFFE] border-[#c9dcf6] text-[#4679C0]'
                          }`}
                        >
                          {reached ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="bg-[#FEFFFE] rounded-xl border border-[#dce8f8] px-4 py-3 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-[#154792]">
                              {step.milestoneLabel}
                            </span>
                            {timelineMatch && (
                              <span className="font-mono text-[10px] font-semibold text-[#4679C0] tabular-nums">
                                {new Date(timelineMatch.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          {timelineMatch && (
                            <p className="text-[11px] text-[#4679C0] mt-0.5">
                              {timelineMatch.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Structured Metadata Rows */}
              <div
                className={`${
                  isMobileView ? '' : 'lg:col-span-5'
                } bg-[#FEFFFE] rounded-2xl border border-[#dce8f8] p-5 space-y-4`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#154792]">Report Metadata</span>
                  <button
                    type="button"
                    onClick={() => onNavigateToStatus(previewReport.id)}
                    className="text-xs font-bold text-[#1177F0] hover:underline"
                  >
                    Open Details
                  </button>
                </div>

                <dl className="divide-y divide-[#F3F7FD] text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <dt className="font-semibold text-[#4679C0]">Tracking ID</dt>
                    <dd className="font-mono font-bold text-[#154792] tabular-nums">
                      {previewReport.id}
                    </dd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <dt className="font-semibold text-[#4679C0]">Assigned Department</dt>
                    <dd className="font-bold text-[#154792] text-right">
                      {previewReport.assignedDepartment}
                    </dd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <dt className="font-semibold text-[#4679C0]">Barangay</dt>
                    <dd className="font-bold text-[#154792]">{previewReport.barangay}</dd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <dt className="font-semibold text-[#4679C0]">Timestamp</dt>
                    <dd className="font-mono font-semibold text-[#154792] tabular-nums">
                      {new Date(previewReport.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                </dl>

                {previewReport.mediaType === 'image' && (
                  <img
                    src={previewReport.mediaUrl}
                    alt={previewReport.title}
                    className="w-full h-36 object-cover rounded-xl border border-[#d6e4f7]"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
