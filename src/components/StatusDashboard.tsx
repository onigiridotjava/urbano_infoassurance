import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Camera,
  Check,
  ClipboardCheck,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Radio,
  Search,
  Send,
  Star,
  Wrench,
} from 'lucide-react';
import { IncidentMap } from './IncidentMap';
import { TRANSLATIONS, type LanguageCode } from '../i18n';
import {
  LGU_DEPARTMENTS,
  SAN_MATEO_BARANGAYS,
  STATUS_STEPS,
  type IncidentReport,
  type LguDepartment,
  type ReportStatus,
  type User,
} from '../types/report';

interface StatusDashboardProps {
  reports: IncidentReport[];
  user: User | null;
  token: string | null;
  lang: LanguageCode;
  sseConnected: boolean;
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  onReportUpdated: (report: IncidentReport) => void;
  onViewOnMap: (reportId: string) => void;
  onRequireAuth: () => void;
}

type FilterKey = 'all' | 'mine' | 'active' | 'resolved';
type LguSidebarMode = 'triage_map' | 'field_mobile' | 'timeline';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  reports,
  user,
  token,
  lang,
  sseConnected,
  selectedReportId,
  onSelectReport,
  onReportUpdated,
  onViewOnMap,
  onRequireAuth,
}) => {
  const t = TRANSLATIONS[lang];
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lguMode, setLguMode] = useState<LguSidebarMode>(
    user?.role === 'lgu_officer' ? 'triage_map' : 'timeline'
  );

  // LGU officer / field staff controls
  const [nextStatus, setNextStatus] = useState<ReportStatus>('in_progress');
  const [nextDept, setNextDept] = useState<LguDepartment>('Municipal Engineering Office');
  const [crewNote, setCrewNote] = useState('');
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState('');
  const [resolutionPhotoName, setResolutionPhotoName] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const resFileRef = useRef<HTMLInputElement | null>(null);

  // Mobile Field Task per-card quick photo state
  const [taskTargetId, setTaskTargetId] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [taskPhotos, setTaskPhotos] = useState<Record<string, { url: string; name: string }>>({});
  const mobileFileRef = useRef<HTMLInputElement | null>(null);

  // Citizen feedback state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(reports.map((r) => r.category))),
    [reports]
  );

  const stats = useMemo(() => {
    const total = reports.length;
    const acknowledged = reports.filter(
      (r) => r.status === 'triaged' || r.status === 'assigned'
    ).length;
    const inProgress = reports.filter((r) => r.status === 'in_progress').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return { total, acknowledged, inProgress, resolved };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter === 'mine' && (!user || r.reporterId !== user.id)) return false;
      if (filter === 'active' && r.status === 'resolved') return false;
      if (filter === 'resolved' && r.status !== 'resolved') return false;
      if (barangayFilter !== 'all' && r.barangay !== barangayFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.addressLabel.toLowerCase().includes(q) ||
        r.barangay.toLowerCase().includes(q) ||
        r.assignedDepartment.toLowerCase().includes(q)
      );
    });
  }, [reports, filter, searchQuery, barangayFilter, categoryFilter, user]);

  const activeReport = useMemo(() => {
    if (selectedReportId) {
      const found = filteredReports.find((r) => r.id === selectedReportId);
      if (found) return found;
      const fallback = reports.find((r) => r.id === selectedReportId);
      if (fallback) return fallback;
    }
    return filteredReports[0] || reports[0] || null;
  }, [reports, filteredReports, selectedReportId]);

  const handleSelectReport = (rep: IncidentReport) => {
    onSelectReport(rep.id);
    setNextStatus(rep.status);
    setNextDept(rep.assignedDepartment);
    setCrewNote('');
    setResolutionPhotoUrl('');
    setResolutionPhotoName('');
    setActionMessage(null);
  };

  const readImageDataUrl = (file: File, onReady: (dataUrl: string, name: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onReady(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOfficerUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !token) return;
    setUpdatingStatus(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/reports/${activeReport.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus,
          assignedDepartment: nextDept,
          note: crewNote,
          resolutionMediaDataUrl: resolutionPhotoUrl || undefined,
          resolutionMediaName: resolutionPhotoName || undefined,
        }),
      });
      const data = (await res.json()) as { report?: IncidentReport; error?: string };
      if (!res.ok || !data.report) {
        throw new Error(data.error || 'Could not update status.');
      }
      onReportUpdated(data.report);
      setCrewNote('');
      setResolutionPhotoUrl('');
      setResolutionPhotoName('');
      setActionMessage(`Updated ${data.report.id} live.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMobileTaskAction = async (rep: IncidentReport, status: ReportStatus) => {
    if (!token) return;
    setUpdatingStatus(true);
    setActionMessage(null);
    const photo = taskPhotos[rep.id];
    try {
      const res = await fetch(`/api/reports/${rep.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          assignedDepartment: rep.assignedDepartment,
          note:
            taskNotes[rep.id] ||
            `Field crew updated task to ${status.replace('_', ' ')}.`,
          resolutionMediaDataUrl: photo?.url,
          resolutionMediaName: photo?.name,
        }),
      });
      const data = (await res.json()) as { report?: IncidentReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error || 'Update failed.');
      onReportUpdated(data.report);
      setActionMessage(`${rep.id} updated to ${status.replace('_', ' ')}.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !token) return;
    setSubmittingFeedback(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/reports/${activeReport.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment: feedbackComment }),
      });
      const data = (await res.json()) as { report?: IncidentReport; error?: string };
      if (!res.ok || !data.report) {
        throw new Error(data.error || 'Could not submit feedback.');
      }
      onReportUpdated(data.report);
      setFeedbackComment('');
      setActionMessage('Resolution rating recorded.');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Unable to save feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const activeStepIdx = activeReport
    ? STATUS_STEPS.findIndex((s) => s.key === activeReport.status)
    : 0;

  return (
    <section className="bg-[#F3F7FD] min-h-[calc(100vh-140px)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#154792] tracking-tight">
            {t.statusTitle}
          </h1>

          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEFFFE] border border-[#d6e4f7] text-xs font-bold text-[#154792]">
              <Radio
                className={`w-3.5 h-3.5 ${sseConnected ? 'text-[#1177F0]' : 'text-amber-500'}`}
              />
              <span>{sseConnected ? 'Live Stream' : 'Connecting'}</span>
            </div>
            {user?.role !== 'lgu_officer' && (
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-3.5 py-1.5 rounded-full bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] text-xs font-extrabold whitespace-nowrap"
              >
                LGU Staff Mode
              </button>
            )}
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Total Reports', value: stats.total, bg: 'bg-[#FEFFFE]', valCls: 'text-[#154792]' },
            { label: 'Acknowledged', value: stats.acknowledged, bg: 'bg-[#FEFFFE]', valCls: 'text-[#145EC1]' },
            { label: 'Crew On-Site', value: stats.inProgress, bg: 'bg-[#FBE95C]', valCls: 'text-[#154792]' },
            { label: 'Resolved', value: stats.resolved, bg: 'bg-[#1177F0]', valCls: 'text-white' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`${kpi.bg} rounded-2xl border border-[#d6e4f7] px-5 py-4 shadow-2xs`}
            >
              <div
                className={`text-xs font-bold ${
                  kpi.valCls === 'text-white' ? 'text-white/85' : 'text-[#4679C0]'
                }`}
              >
                {kpi.label}
              </div>
              <div className={`text-2xl font-extrabold font-mono tabular-nums mt-1 ${kpi.valCls}`}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Shell with Optional Left Icon Sidebar (Jur-style) when LGU Staff is signed in */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {user?.role === 'lgu_officer' && (
            <aside className="w-full lg:w-20 bg-[#154792] rounded-2xl p-2.5 flex lg:flex-col items-center justify-around lg:justify-start gap-2.5 shrink-0 shadow-lg">
              {(
                [
                  { id: 'triage_map' as LguSidebarMode, label: 'Triage', Icon: MapIcon },
                  { id: 'field_mobile' as LguSidebarMode, label: 'Field', Icon: ClipboardCheck },
                  { id: 'timeline' as LguSidebarMode, label: 'Details', Icon: LayoutGrid },
                ] as const
              ).map((item) => {
                const active = lguMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLguMode(item.id)}
                    className={`w-full lg:w-14 py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition-colors ${
                      active
                        ? 'bg-[#FBE95C] text-[#154792]'
                        : 'text-[#BFD9FA] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </aside>
          )}

          <div className="flex-1 w-full space-y-5">
            {/* Search & Barangay/Category Filter Strip */}
            <div className="bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: 'All' },
                    ...(user ? [{ key: 'mine' as FilterKey, label: 'My Reports' }] : []),
                    { key: 'active', label: 'Active' },
                    { key: 'resolved', label: 'Resolved' },
                  ] as { key: FilterKey; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                      filter === tab.key
                        ? 'bg-[#1177F0] text-white'
                        : 'bg-[#F3F7FD] text-[#154792] hover:bg-[#e4eefc]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={barangayFilter}
                  onChange={(e) => setBarangayFilter(e.target.value)}
                  aria-label="Filter by San Mateo Barangay"
                  className="px-3 py-2 text-xs font-semibold bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                >
                  <option value="all">All Barangays</option>
                  {SAN_MATEO_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by Report Category"
                  className="px-3 py-2 text-xs font-semibold bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-[#4679C0] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID or street..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792] focus:outline-none focus:ring-2 focus:ring-[#1177F0]"
                  />
                </div>
              </div>
            </div>

            {actionMessage && (
              <div className="px-4 py-3 rounded-2xl bg-[#FBE95C] text-[#154792] text-xs font-extrabold">
                {actionMessage}
              </div>
            )}

            {/* VIEW 1: LGU Triage & Map Split-View */}
            {user?.role === 'lgu_officer' && lguMode === 'triage_map' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Filterable Queue with AI Duplicate Alerts */}
                <div className="lg:col-span-5 bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] divide-y divide-[#F3F7FD] max-h-[600px] overflow-y-auto">
                  {filteredReports.map((rep) => {
                    const selected = activeReport?.id === rep.id;
                    const isResolved = rep.status === 'resolved';
                    return (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => handleSelectReport(rep)}
                        className={`w-full text-left p-4 space-y-2 transition-colors ${
                          selected ? 'bg-[#F3F7FD]' : 'hover:bg-[#F3F7FD]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#1177F0] tabular-nums">
                            {rep.id}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isResolved
                                ? 'bg-[#1177F0] text-white'
                                : 'bg-[#FBE95C] text-[#154792]'
                            }`}
                          >
                            {rep.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[#154792]">{rep.title}</div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#4679C0]">
                          <span>{rep.barangay}</span>
                          <span>{rep.category}</span>
                        </div>
                        {rep.aiAnalysis?.duplicateOfId && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FBE95C]/65 text-[#154792] text-[10px] font-extrabold">
                            <AlertTriangle className="w-3 h-3" />
                            AI Duplicate Alert: {rep.aiAnalysis.duplicateOfId}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Map + Quick LGU Dispatch */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-3 h-[340px]">
                    <IncidentMap
                      reports={filteredReports}
                      mode="explorer"
                      highlightedReportId={activeReport?.id || null}
                      onSelectReport={handleSelectReport}
                      showIncidents={true}
                      showClosures={true}
                      className="h-full min-h-[310px]"
                    />
                  </div>

                  {activeReport && (
                    <form
                      onSubmit={handleOfficerUpdate}
                      className="bg-[#154792] text-white rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#FBE95C]">
                          Quick Dispatch · {activeReport.id}
                        </span>
                        <span className="text-[11px] text-[#BFD9FA]">{activeReport.barangay}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={nextDept}
                          onChange={(e) => setNextDept(e.target.value as LguDepartment)}
                          className="px-3 py-2 rounded-xl bg-[#0F3673] border border-[#5EABF0]/40 text-xs text-white"
                        >
                          {LGU_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value as ReportStatus)}
                          className="px-3 py-2 rounded-xl bg-[#0F3673] border border-[#5EABF0]/40 text-xs text-white"
                        >
                          {STATUS_STEPS.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={crewNote}
                          onChange={(e) => setCrewNote(e.target.value)}
                          placeholder="Crew dispatch note..."
                          className="flex-1 px-3 py-2 rounded-xl bg-[#0F3673] border border-[#5EABF0]/40 text-xs text-white placeholder-[#9CC4F5]"
                        />
                        <button
                          type="submit"
                          disabled={updatingStatus}
                          className="px-4 py-2 rounded-xl bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Update Live
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : user?.role === 'lgu_officer' && lguMode === 'field_mobile' ? (
              /* VIEW 2: Mobile Field Staff View */
              <div className="space-y-4">
                <input
                  ref={mobileFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && taskTargetId) {
                      readImageDataUrl(file, (url, name) => {
                        setTaskPhotos((prev) => ({ ...prev, [taskTargetId]: { url, name } }));
                      });
                    }
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredReports.map((rep) => {
                    const isResolved = rep.status === 'resolved';
                    const pendingPhoto = taskPhotos[rep.id];
                    return (
                      <div
                        key={rep.id}
                        className="bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] overflow-hidden flex flex-col justify-between shadow-sm"
                      >
                        <div className="relative h-44 bg-[#154792]">
                          <img
                            src={pendingPhoto?.url || rep.resolutionMediaUrl || rep.mediaUrl}
                            alt={rep.title}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-extrabold ${
                              isResolved
                                ? 'bg-[#1177F0] text-white'
                                : 'bg-[#FBE95C] text-[#154792]'
                            }`}
                          >
                            {isResolved ? 'RESOLVED' : rep.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-[#1177F0]">{rep.id}</span>
                            <span className="font-bold text-[#154792]">{rep.barangay}</span>
                          </div>
                          <h3 className="text-sm font-extrabold text-[#154792]">{rep.title}</h3>
                          <p className="text-xs font-semibold text-[#4679C0] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#1177F0] shrink-0" />
                            <span>{rep.addressLabel}</span>
                          </p>

                          <input
                            type="text"
                            value={taskNotes[rep.id] || ''}
                            onChange={(e) =>
                              setTaskNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                            }
                            placeholder="Field crew action note..."
                            className="w-full px-3 py-2 text-xs bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTaskTargetId(rep.id);
                                mobileFileRef.current?.click();
                              }}
                              className="px-3 py-2 rounded-xl bg-[#F3F7FD] border border-[#c7daf6] text-xs font-bold text-[#154792] inline-flex items-center gap-1.5"
                            >
                              <Camera className="w-3.5 h-3.5 text-[#1177F0]" />
                              {pendingPhoto ? 'After Photo Ready' : 'After / Resolved Photo'}
                            </button>

                            <button
                              type="button"
                              disabled={updatingStatus}
                              onClick={() => void handleMobileTaskAction(rep, 'in_progress')}
                              className="px-3 py-2 rounded-xl bg-[#FBE95C] text-[#154792] text-xs font-extrabold"
                            >
                              On-Site
                            </button>

                            <button
                              type="button"
                              disabled={updatingStatus}
                              onClick={() => void handleMobileTaskAction(rep, 'resolved')}
                              className="px-3 py-2 rounded-xl bg-[#1177F0] text-white text-xs font-extrabold"
                            >
                              Mark Resolved
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* VIEW 3: Master-Detail Vertical Milestone Timeline Inspector */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Report List */}
                <div className="lg:col-span-5 bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] divide-y divide-[#F3F7FD] overflow-hidden">
                  {filteredReports.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-[#4679C0]">
                      No matching San Mateo reports found.
                    </div>
                  ) : (
                    filteredReports.map((rep) => {
                      const isSelected = activeReport?.id === rep.id;
                      const isResolved = rep.status === 'resolved';
                      return (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => handleSelectReport(rep)}
                          className={`w-full text-left p-4 transition-colors space-y-1.5 ${
                            isSelected ? 'bg-[#F3F7FD] border-l-4 border-l-[#1177F0]' : 'hover:bg-[#F3F7FD]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#1177F0] tabular-nums">
                              {rep.id}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isResolved
                                  ? 'bg-[#1177F0] text-white'
                                  : 'bg-[#FBE95C] text-[#154792]'
                              }`}
                            >
                              {isResolved ? 'RESOLVED' : 'ACKNOWLEDGED'}
                            </span>
                          </div>
                          <div className="text-sm font-extrabold text-[#154792] leading-snug">
                            {rep.title}
                          </div>
                          <div className="text-[11px] font-semibold text-[#4679C0]">
                            {rep.category} · {rep.barangay}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Right Detail: Vertical Milestone Timeline & Metadata Rows */}
                {activeReport && (
                  <div className="lg:col-span-7 bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-6 space-y-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F3F7FD] pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-extrabold text-[#1177F0] tabular-nums">
                            {activeReport.id}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F3F7FD] text-[#154792] font-bold">
                            {activeReport.category}
                          </span>
                        </div>
                        <h2 className="font-display text-xl font-extrabold text-[#154792] mt-1">
                          {activeReport.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewOnMap(activeReport.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View on Map
                      </button>
                    </div>

                    {/* Evidence Photo + Structured Metadata Rows */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                      <div className="sm:col-span-5 space-y-2">
                        <div className="relative rounded-2xl overflow-hidden border border-[#d6e4f7] bg-[#154792]">
                          {activeReport.mediaType === 'video' ? (
                            <video
                              src={activeReport.mediaUrl}
                              controls
                              className="w-full h-44 object-contain"
                            />
                          ) : (
                            <img
                              src={activeReport.mediaUrl}
                              alt={activeReport.title}
                              className="w-full h-44 object-cover"
                            />
                          )}
                        </div>
                        {activeReport.resolutionMediaUrl && (
                          <div className="rounded-xl overflow-hidden border border-[#1177F0]/40 bg-[#F3F7FD] p-2">
                            <span className="text-[10px] font-extrabold text-[#1177F0] block mb-1">
                              RESOLVED PROOF PHOTO
                            </span>
                            <img
                              src={activeReport.resolutionMediaUrl}
                              alt="Resolution proof"
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>

                      <dl className="sm:col-span-7 divide-y divide-[#F3F7FD] text-xs bg-[#F3F7FD]/60 rounded-2xl px-4 py-1 border border-[#e3eefb]">
                        <div className="py-2.5 flex items-center justify-between gap-3">
                          <dt className="font-semibold text-[#4679C0]">Tracking ID</dt>
                          <dd className="font-mono font-bold text-[#154792] tabular-nums">
                            {activeReport.id}
                          </dd>
                        </div>
                        <div className="py-2.5 flex items-center justify-between gap-3">
                          <dt className="font-semibold text-[#4679C0]">Assigned Department</dt>
                          <dd className="font-bold text-[#154792] text-right">
                            {activeReport.assignedDepartment}
                          </dd>
                        </div>
                        <div className="py-2.5 flex items-center justify-between gap-3">
                          <dt className="font-semibold text-[#4679C0]">Barangay</dt>
                          <dd className="font-bold text-[#154792]">{activeReport.barangay}</dd>
                        </div>
                        <div className="py-2.5 flex items-center justify-between gap-3">
                          <dt className="font-semibold text-[#4679C0]">Location</dt>
                          <dd className="font-bold text-[#154792] text-right">
                            {activeReport.addressLabel}
                          </dd>
                        </div>
                        <div className="py-2.5 flex items-center justify-between gap-3">
                          <dt className="font-semibold text-[#4679C0]">Timestamp</dt>
                          <dd className="font-mono font-semibold text-[#154792] tabular-nums">
                            {formatTimestamp(activeReport.createdAt)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Vertical Milestone Timeline with Color-Coded Circular Nodes */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-extrabold text-[#154792]">
                        Resolution Milestones
                      </h3>
                      <div className="relative pl-10 space-y-4">
                        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-[#d6e4f7]" />
                        {STATUS_STEPS.filter((s) => s.key !== 'in_progress').map((step, idx) => {
                          const stepRank = STATUS_STEPS.findIndex((s) => s.key === step.key);
                          const reached = activeStepIdx >= stepRank;
                          const isCurrent =
                            activeStepIdx === stepRank ||
                            (activeReport.status === 'in_progress' && step.key === 'assigned');
                          const match = [...activeReport.timeline]
                            .reverse()
                            .find((tItem) => tItem.status === step.key);
                          return (
                            <div key={step.key} className="relative flex items-start gap-3">
                              <div
                                className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 ${
                                  reached
                                    ? isCurrent && activeReport.status !== 'resolved'
                                      ? 'bg-[#FBE95C] border-[#154792] text-[#154792]'
                                      : 'bg-[#1177F0] border-[#1177F0] text-white'
                                    : 'bg-[#FEFFFE] border-[#d6e4f7] text-[#4679C0]'
                                }`}
                              >
                                {reached ? <Check className="w-4 h-4" /> : idx + 1}
                              </div>
                              <div className="flex-1 rounded-xl bg-[#F3F7FD] border border-[#dce8f8] px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-[#154792]">
                                    {step.milestoneLabel}
                                  </span>
                                  {match && (
                                    <span className="font-mono text-[10px] font-semibold text-[#4679C0] tabular-nums">
                                      {formatTimestamp(match.timestamp)}
                                    </span>
                                  )}
                                </div>
                                {match && (
                                  <p className="text-[11px] text-[#4679C0] mt-0.5">{match.note}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* LGU Update Panel inside Timeline Details */}
                    {user?.role === 'lgu_officer' ? (
                      <form
                        onSubmit={handleOfficerUpdate}
                        className="p-5 rounded-2xl bg-[#154792] text-white space-y-3"
                      >
                        <div className="flex items-center gap-2 text-xs font-extrabold text-[#FBE95C]">
                          <Wrench className="w-4 h-4" />
                          LGU Dispatcher Update
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            value={nextDept}
                            onChange={(e) => setNextDept(e.target.value as LguDepartment)}
                            className="px-3 py-2 rounded-xl bg-[#0F3673] border border-[#5EABF0]/40 text-xs text-white"
                          >
                            {LGU_DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                          <select
                            value={nextStatus}
                            onChange={(e) => setNextStatus(e.target.value as ReportStatus)}
                            className="px-3 py-2 rounded-xl bg-[#0F3673] border border-[#5EABF0]/40 text-xs text-white"
                          >
                            {STATUS_STEPS.map((st) => (
                              <option key={st.key} value={st.key}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={crewNote}
                          onChange={(e) => setCrewNote(e.target.value)}
                          placeholder="Crew note..."
                          className="w-full px-3 py-2 rounded-xl bg-[#0F3673] border border-[#5EABF0]/40 text-xs text-white placeholder-[#9CC4F5]"
                        />
                        <input
                          ref={resFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              readImageDataUrl(f, (url, name) => {
                                setResolutionPhotoUrl(url);
                                setResolutionPhotoName(name);
                              });
                            }
                          }}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => resFileRef.current?.click()}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#FBE95C]" />
                            {resolutionPhotoName || 'Attach After Photo'}
                          </button>
                          <button
                            type="submit"
                            disabled={updatingStatus}
                            className="px-4 py-2 rounded-xl bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] text-xs font-extrabold inline-flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {updatingStatus ? 'Updating...' : 'Push Update'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      !user && (
                        <div className="p-4 rounded-2xl bg-[#F3F7FD] border border-[#d6e4f7] flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 font-semibold text-[#154792]">
                            <Building2 className="w-4 h-4 text-[#1177F0]" />
                            <span>LGU Staff can update status &amp; upload proof photos.</span>
                          </div>
                          <button
                            type="button"
                            onClick={onRequireAuth}
                            className="px-3.5 py-2 rounded-xl bg-[#1177F0] text-white font-bold whitespace-nowrap"
                          >
                            Sign In
                          </button>
                        </div>
                      )
                    )}

                    {/* Citizen Resolution Rating */}
                    {activeReport.status === 'resolved' && (
                      <div className="p-4 rounded-2xl bg-[#F3F7FD] border border-[#1177F0]/30 space-y-2.5">
                        <div className="text-xs font-extrabold text-[#154792]">
                          Citizen Resolution Rating
                        </div>
                        {activeReport.feedback ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-[#154792]">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < activeReport.feedback!.rating
                                      ? 'text-[#1177F0] fill-[#FBE95C]'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span>“{activeReport.feedback.comment}”</span>
                          </div>
                        ) : user &&
                          (user.id === activeReport.reporterId || user.role === 'lgu_officer') ? (
                          <form onSubmit={handleFeedbackSubmit} className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  aria-label={`Rate ${star} stars`}
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      star <= rating
                                        ? 'text-[#1177F0] fill-[#FBE95C]'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              placeholder="Feedback on repair..."
                              className="flex-1 px-3 py-1.5 rounded-xl bg-[#FEFFFE] border border-[#d6e4f7] text-xs"
                            />
                            <button
                              type="submit"
                              disabled={submittingFeedback}
                              className="px-3.5 py-1.5 rounded-xl bg-[#1177F0] text-white text-xs font-bold"
                            >
                              Submit
                            </button>
                          </form>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
