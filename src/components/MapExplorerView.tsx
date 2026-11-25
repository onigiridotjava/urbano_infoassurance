import React, { useMemo, useState } from 'react';
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
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Construction,
  Layers,
  MapPin,
  Send,
} from 'lucide-react';

interface MapExplorerViewProps {
  reports: IncidentReport[];
  user: User | null;
  token: string | null;
  lang: LanguageCode;
  highlightedReportId: string | null;
  onTrackReport: (reportId: string) => void;
  onReportUpdated: (report: IncidentReport) => void;
  isMobileView?: boolean;
}

export const MapExplorerView: React.FC<MapExplorerViewProps> = ({
  reports,
  user,
  token,
  lang,
  highlightedReportId,
  onTrackReport,
  onReportUpdated,
  isMobileView = false,
}) => {
  const t = TRANSLATIONS[lang];

  const [showIncidents, setShowIncidents] = useState(true);
  const [showClosures, setShowClosures] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);

  const [barangayFilter, setBarangayFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(highlightedReportId);

  const [dispatchDept, setDispatchDept] = useState<LguDepartment>(
    'San Mateo Solid Waste & Sanitation'
  );
  const [dispatchStatus, setDispatchStatus] = useState<ReportStatus>('assigned');
  const [dispatching, setDispatching] = useState(false);

  const uniqueCategories = useMemo(() => {
    const set = new Set(reports.map((r) => r.category));
    return Array.from(set);
  }, [reports]);

  const visibleReports = useMemo(() => {
    return reports.filter((r) => {
      if (barangayFilter !== 'all' && r.barangay !== barangayFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [reports, barangayFilter, categoryFilter]);

  const focusedReport = useMemo(() => {
    const id = selectedId || highlightedReportId;
    return visibleReports.find((r) => r.id === id) || visibleReports[0] || null;
  }, [visibleReports, selectedId, highlightedReportId]);

  const handleSelectPin = (rep: IncidentReport) => {
    setSelectedId(rep.id);
    setDispatchDept(rep.assignedDepartment);
    setDispatchStatus(rep.status);
  };

  const handleQuickDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedReport || !token || user?.role !== 'lgu_officer') return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/reports/${focusedReport.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: dispatchStatus,
          assignedDepartment: dispatchDept,
          note: `Dispatched via San Mateo Map Console to ${dispatchDept}.`,
        }),
      });
      const data = (await res.json()) as { report?: IncidentReport };
      if (res.ok && data.report) {
        onReportUpdated(data.report);
      }
    } finally {
      setDispatching(false);
    }
  };

  return (
    <section className="bg-[#F3F7FD] min-h-[calc(100vh-140px)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#154792] tracking-tight">
            {t.mapExplorerTitle}
          </h1>

          {/* Map Layer Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIncidents((v) => !v)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                showIncidents
                  ? 'bg-[#1177F0] text-white border-[#1177F0]'
                  : 'bg-[#FEFFFE] text-[#154792] border-[#d6e4f7]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t.layerIncidents}
            </button>

            <button
              type="button"
              onClick={() => setShowClosures((v) => !v)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                showClosures
                  ? 'bg-[#FBE95C] text-[#154792] border-[#154792]/30'
                  : 'bg-[#FEFFFE] text-[#154792] border-[#d6e4f7]'
              }`}
            >
              <Construction className="w-3.5 h-3.5" />
              {t.layerClosures}
            </button>

            <button
              type="button"
              onClick={() => setShowFacilities((v) => !v)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                showFacilities
                  ? 'bg-[#154792] text-white border-[#154792]'
                  : 'bg-[#FEFFFE] text-[#154792] border-[#d6e4f7]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {t.layerFacilities}
            </button>
          </div>
        </div>

        {/* Split-Screen Map + Barangay/Category Filter Sidebar */}
        <div
          className={`grid grid-cols-1 ${
            isMobileView ? 'gap-4' : 'lg:grid-cols-12 gap-6'
          } items-stretch`}
        >
          <div
            className={`${
              isMobileView ? 'h-[320px]' : 'lg:col-span-8 h-[400px] sm:h-[560px]'
            } bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-2.5 sm:p-3 shadow-sm`}
          >
            <IncidentMap
              reports={visibleReports}
              mode="explorer"
              highlightedReportId={focusedReport?.id || null}
              onSelectReport={handleSelectPin}
              showIncidents={showIncidents}
              showClosures={showClosures}
              showFacilities={showFacilities}
              className={isMobileView ? 'min-h-[290px]' : ''}
            />
          </div>

          <div
            className={`${
              isMobileView ? '' : 'lg:col-span-4 max-h-[560px]'
            } bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] flex flex-col overflow-hidden shadow-sm`}
          >
            <div className="p-3.5 bg-[#154792] text-white space-y-2.5">
              <div className="text-xs font-extrabold text-[#FBE95C]">
                San Mateo Barangay &amp; Category Filter
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={barangayFilter}
                  onChange={(e) => setBarangayFilter(e.target.value)}
                  aria-label="Filter by Barangay"
                  className="px-2.5 py-2 text-xs bg-[#FEFFFE] text-[#154792] font-semibold rounded-xl focus:outline-none"
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
                  aria-label="Filter by Category"
                  className="px-2.5 py-2 text-xs bg-[#FEFFFE] text-[#154792] font-semibold rounded-xl focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#F3F7FD]">
              {visibleReports.map((rep) => {
                const isActive = focusedReport?.id === rep.id;
                const isResolved = rep.status === 'resolved';
                const step = STATUS_STEPS.find((s) => s.key === rep.status);
                return (
                  <div
                    key={rep.id}
                    onClick={() => handleSelectPin(rep)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelectPin(rep);
                    }}
                    className={`p-4 cursor-pointer transition-colors space-y-2 ${
                      isActive ? 'bg-[#F3F7FD]' : 'hover:bg-[#F3F7FD]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-bold text-[#1177F0] tabular-nums">
                        {rep.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isResolved
                            ? 'bg-[#1177F0] text-white'
                            : 'bg-[#FBE95C] text-[#154792]'
                        }`}
                      >
                        {step?.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-[#154792] leading-snug">
                      {rep.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#4679C0] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#1177F0] shrink-0" />
                      <span className="truncate">{rep.addressLabel}</span>
                    </p>
                    {rep.aiAnalysis?.duplicateOfId && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FBE95C]/70 text-[#154792] text-[10px] font-extrabold">
                        <AlertTriangle className="w-3 h-3" />
                        Duplicate Match: {rep.aiAnalysis.duplicateOfId}
                      </div>
                    )}
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#4679C0] truncate">{rep.barangay}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTrackReport(rep.id);
                        }}
                        className="font-bold text-[#1177F0] hover:text-[#154792] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        Track
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {user?.role === 'lgu_officer' && focusedReport && (
              <form
                onSubmit={handleQuickDispatch}
                className="p-3.5 bg-[#154792] text-white space-y-2 border-t border-[#d6e4f7]"
              >
                <div className="text-[11px] font-extrabold text-[#FBE95C]">
                  LGU Quick Dispatch · {focusedReport.id}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={dispatchDept}
                    onChange={(e) => setDispatchDept(e.target.value as LguDepartment)}
                    className="px-2 py-1.5 rounded-lg bg-[#0F3673] border border-[#5EABF0]/40 text-[11px] text-white"
                  >
                    {LGU_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    value={dispatchStatus}
                    onChange={(e) => setDispatchStatus(e.target.value as ReportStatus)}
                    className="px-2 py-1.5 rounded-lg bg-[#0F3673] border border-[#5EABF0]/40 text-[11px] text-white"
                  >
                    {STATUS_STEPS.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="w-full py-2 rounded-lg bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] text-xs font-extrabold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  {dispatching ? 'Updating...' : 'Push Dispatch Update'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
