import { useEffect, useRef, useState } from 'react';
import { AuthPage } from './components/AuthPage';
import { ComplaintIntake, type PendingComplaintDraft } from './components/ComplaintIntake';
import { StatusDashboard } from './components/StatusDashboard';
import { MapExplorerView } from './components/MapExplorerView';
import { HotlinesAndNotices } from './components/HotlinesAndNotices';
import { SupportChatDrawer } from './components/SupportChatDrawer';
import { TRANSLATIONS, type LanguageCode } from './i18n';
import type { CityAnnouncement, IncidentReport, User } from './types/report';
import {
  Activity,
  Bell,
  Camera,
  ExternalLink,
  Globe,
  Headphones,
  Home,
  LogOut,
  MapPin,
  Monitor,
  PhoneCall,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';

type ActiveTab = 'home' | 'status' | 'map' | 'notices' | 'auth';

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
  reportId?: string;
}

const TOKEN_STORAGE_KEY = 'esm_auth_token';

const OFFICIAL_PORTALS = [
  {
    name: 'Municipality of San Mateo, Rizal',
    subtitle: 'Official municipal services & ordinances',
    url: 'https://sanmateo.gov.ph/',
  },
  {
    name: 'DICT eGovPH Citizen Portal',
    subtitle: 'National e-governance services',
    url: 'https://e.gov.ph/',
  },
  {
    name: "8888 Citizens' Complaint Center",
    subtitle: 'National agency assistance desk',
    url: 'https://8888.gov.ph/',
  },
  {
    name: 'San Mateo Hotlines & Notices',
    subtitle: 'Road closures & barangay advisories',
    tab: 'notices' as ActiveTab,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [lang, setLang] = useState<LanguageCode>('en');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [announcements, setAnnouncements] = useState<CityAnnouncement[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  // Mobile Version preview toggle for desktop users + automatic mobile detection
  const [mobilePreview, setMobilePreview] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const [authContextMessage, setAuthContextMessage] = useState<string | undefined>(undefined);
  const [pendingDraft, setPendingDraft] = useState<PendingComplaintDraft | null>(null);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      title: 'Crew En Route · ESM-SM-0106',
      detail: 'San Mateo Solid Waste Truck #04 along Gen. Luna Ave.',
      time: '22m ago',
      read: false,
      reportId: 'ESM-SM-0106',
    },
    {
      id: 'n2',
      title: 'Resolved · ESM-SM-0103',
      detail: 'Forestry crew cleared branches along Daang Bakal St.',
      time: '6h ago',
      read: false,
      reportId: 'ESM-SM-0103',
    },
  ]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [forceGuidedMode, setForceGuidedMode] = useState(false);

  const headerRightRef = useRef<HTMLDivElement | null>(null);
  const t = TRANSLATIONS[lang];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const isMobileLayout = isNarrowScreen || mobilePreview;
  const isDesktopPhoneFrame = mobilePreview && !isNarrowScreen;

  useEffect(() => {
    const onResize = () => {
      setIsNarrowScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showToast = (msg: string) => {
    setLiveToast(msg);
    window.setTimeout(() => {
      setLiveToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (headerRightRef.current && !headerRightRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setGlobeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const [reportsRes, annRes, meRes] = await Promise.all([
          fetch('/api/reports'),
          fetch('/api/announcements'),
          storedToken
            ? fetch('/api/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
            : Promise.resolve(null),
        ]);

        if (!mounted) return;
        if (reportsRes.ok) {
          const data = (await reportsRes.json()) as { reports: IncidentReport[] };
          setReports(data.reports || []);
        }
        if (annRes.ok) {
          const data = (await annRes.json()) as { announcements: CityAnnouncement[] };
          setAnnouncements(data.announcements || []);
        }
        if (meRes && meRes.ok) {
          const data = (await meRes.json()) as { user: User };
          setUser(data.user);
        } else if (storedToken) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/events');

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    es.addEventListener('report_created', (event) => {
      const created = JSON.parse((event as MessageEvent).data) as IncidentReport;
      setReports((prev) => {
        if (prev.some((r) => r.id === created.id)) return prev;
        return [created, ...prev];
      });
      setNotifications((prev) => [
        {
          id: `n_${Date.now()}`,
          title: `New Report · ${created.id}`,
          detail: `${created.category} · ${created.barangay}`,
          time: 'Just now',
          read: false,
          reportId: created.id,
        },
        ...prev.slice(0, 9),
      ]);
      showToast(`Logged ${created.id} (${created.category})`);
    });

    es.addEventListener('report_updated', (event) => {
      const updated = JSON.parse((event as MessageEvent).data) as IncidentReport;
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setNotifications((prev) => [
        {
          id: `n_${Date.now()}`,
          title: `Updated · ${updated.id}`,
          detail: `${updated.status.replace('_', ' ').toUpperCase()} — ${updated.assignedDepartment}`,
          time: 'Just now',
          read: false,
          reportId: updated.id,
        },
        ...prev.slice(0, 9),
      ]);
      showToast(`Live update on ${updated.id}`);
    });

    es.addEventListener('announcement_created', (event) => {
      const ann = JSON.parse((event as MessageEvent).data) as CityAnnouncement;
      setAnnouncements((prev) => {
        if (prev.some((a) => a.id === ann.id)) return prev;
        return [ann, ...prev];
      });
      showToast(`San Mateo Notice: ${ann.title}`);
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
    };
  }, []);

  const handleAuthSuccess = (authedUser: User, authToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    setToken(authToken);
    setUser(authedUser);
    setAuthContextMessage(undefined);
    if (pendingDraft) {
      setActiveTab('home');
    } else if (authedUser.role === 'lgu_officer') {
      setActiveTab('status');
    } else {
      setActiveTab('home');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setActiveTab('home');
  };

  const openStatusForReport = (reportId?: string) => {
    if (reportId) setSelectedReportId(reportId);
    setActiveTab('status');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMapForReport = (reportId?: string) => {
    if (reportId) setSelectedReportId(reportId);
    setActiveTab('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToFileReport = () => {
    setActiveTab('home');
    window.setTimeout(() => {
      const stepperEl = document.getElementById('report-stepper');
      if (stepperEl) {
        stepperEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    }, 60);
  };

  return (
    <div
      className={
        isDesktopPhoneFrame
          ? 'min-h-screen bg-[#E4ECF8] py-4 px-3 flex flex-col items-center'
          : 'min-h-screen flex flex-col bg-[#FEFFFE] text-[#154792]'
      }
    >
      {/* Desktop-only top bar above Phone Frame when Mobile Version is toggled */}
      {isDesktopPhoneFrame && (
        <div className="w-full max-w-[420px] mb-3 flex items-center justify-between px-3 py-2 rounded-2xl bg-[#FEFFFE] border border-[#c8daf3] shadow-sm">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/E-sumbong_logo_dfdc32ee.png"
              alt="e-Sumbong Mo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-display text-xs font-extrabold text-[#154792]">
              Mobile Version
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobilePreview(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#154792] hover:bg-[#1177F0] text-white text-xs font-bold transition-colors"
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop View
          </button>
        </div>
      )}

      <div
        className={
          isDesktopPhoneFrame
            ? 'w-full max-w-[420px] h-[820px] rounded-[36px] border-[6px] border-[#154792] shadow-2xl bg-[#FEFFFE] text-[#154792] flex flex-col overflow-hidden relative'
            : 'min-h-screen flex flex-col bg-[#FEFFFE] text-[#154792] w-full'
        }
      >
        {/* Sticky Deep Civic Navy Top Navigation Bar (#154792) */}
        <header className="bg-[#154792] text-white sticky top-0 z-30 border-b border-[#2559a7] shrink-0">
          <div
            className={`max-w-7xl mx-auto ${
              isMobileLayout ? 'px-3 h-14' : 'px-4 sm:px-6 h-16'
            } flex items-center justify-between gap-2 sm:gap-4`}
          >
            {/* Left: Integrated Uploaded Logo Badge + Wordmark + San Mateo Badge */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBE95C] rounded-xl"
            >
              <div
                className={`${
                  isMobileLayout ? 'w-8 h-8 rounded-lg p-1' : 'w-9 h-9 rounded-xl p-1'
                } bg-[#FEFFFE] shadow-sm flex items-center justify-center shrink-0`}
              >
                <img
                  src="/media/E-sumbong logo.png"
                  alt="e-Sumbong Mo logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className={`font-display ${
                  isMobileLayout ? 'text-sm' : 'text-base sm:text-lg'
                } font-extrabold tracking-tight text-white whitespace-nowrap`}
              >
                e-Sumbong Mo
              </span>
              {!isMobileLayout && (
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-[#1177F0] text-[#FEFFFE] text-[11px] font-extrabold tracking-wide whitespace-nowrap">
                  San Mateo
                </span>
              )}
            </button>

            {/* Center: 4 Clean Links (Desktop only) */}
            {!isMobileLayout && (
              <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#D6E6FB]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'home'
                      ? 'border-[#FBE95C] text-white font-bold'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  {t.navHome}
                </button>
                <button
                  type="button"
                  onClick={goToFileReport}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'status'
                      ? 'border-[#FBE95C] text-white font-bold'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  {t.navReport}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'map'
                      ? 'border-[#FBE95C] text-white font-bold'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  {t.navMap}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'notices'
                      ? 'border-[#FBE95C] text-white font-bold'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  {t.navHotlines}
                </button>
              </nav>
            )}

            {/* Right: Mobile Toggle (on desktop), Language, Bell, Headset Support, Globe Portals, Sign In */}
            <div ref={headerRightRef} className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
              {!isNarrowScreen && !mobilePreview && (
                <button
                  type="button"
                  onClick={() => setMobilePreview(true)}
                  aria-label="Switch to Mobile Version"
                  title="Switch to Mobile Version"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#145EC1] hover:bg-[#1177F0] border border-white/20 text-[11px] font-bold text-white whitespace-nowrap transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#FBE95C]" />
                  <span>Mobile</span>
                </button>
              )}

              <select
                aria-label="Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className={`${
                  isMobileLayout ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
                } rounded-full bg-[#145EC1] hover:bg-[#1177F0] border border-white/20 font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FBE95C] cursor-pointer`}
              >
                <option value="en" className="text-[#154792] bg-white">
                  EN
                </option>
                <option value="tl" className="text-[#154792] bg-white">
                  {isMobileLayout ? 'TL' : 'Tagalog'}
                </option>
              </select>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setGlobeOpen(false);
                  }}
                  className="relative p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-4 px-1 rounded-full bg-[#FBE95C] text-[#154792] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#FEFFFE] text-[#154792] rounded-2xl border border-[#d6e4f7] shadow-2xl overflow-hidden z-40">
                    <div className="px-4 py-3 bg-[#154792] text-white flex items-center justify-between">
                      <span className="text-xs font-extrabold">Live Notifications</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                        }
                        className="text-[11px] text-[#FBE95C] hover:underline font-bold"
                      >
                        Mark read
                      </button>
                    </div>
                    <div className="divide-y divide-[#F3F7FD] max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNotifications((prev) =>
                              prev.map((item) =>
                                item.id === n.id ? { ...item, read: true } : item
                              )
                            );
                            setNotifOpen(false);
                            if (n.reportId) {
                              openStatusForReport(n.reportId);
                            } else {
                              setActiveTab('notices');
                            }
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-[#F3F7FD] transition-colors space-y-0.5 ${
                            n.read ? 'opacity-70' : 'bg-[#F3F7FD]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-extrabold text-[#154792] truncate">{n.title}</span>
                            <span className="text-[10px] text-[#4679C0] shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-[#4679C0] line-clamp-2">{n.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Support Headset Icon */}
              <button
                type="button"
                aria-label="Citizen Support Assistant"
                title="San Mateo Support Desk"
                onClick={() => {
                  setNotifOpen(false);
                  setGlobeOpen(false);
                  setSupportOpen(true);
                }}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white"
              >
                <Headphones className="w-4 h-4" />
              </button>

              {/* Official LGU Portal Globe Icon (hidden on ultra-compact mobile bar to keep spacing crisp) */}
              {!isMobileLayout && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Official LGU Portals"
                    title="Official LGU Portals"
                    onClick={() => {
                      setGlobeOpen((v) => !v);
                      setNotifOpen(false);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                  >
                    <Globe className="w-4 h-4" />
                  </button>

                  {globeOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-[#FEFFFE] text-[#154792] rounded-2xl border border-[#d6e4f7] shadow-2xl overflow-hidden z-40">
                      <div className="px-4 py-3 bg-[#154792] text-white text-xs font-extrabold">
                        Official San Mateo &amp; Gov Portals
                      </div>
                      <div className="divide-y divide-[#F3F7FD]">
                        {OFFICIAL_PORTALS.map((portal) =>
                          portal.url ? (
                            <a
                              key={portal.name}
                              href={portal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setGlobeOpen(false)}
                              className="px-4 py-3 hover:bg-[#F3F7FD] flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <div className="font-bold text-[#154792]">{portal.name}</div>
                                <div className="text-[11px] text-[#4679C0]">{portal.subtitle}</div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-[#1177F0] shrink-0" />
                            </a>
                          ) : (
                            <button
                              key={portal.name}
                              type="button"
                              onClick={() => {
                                setGlobeOpen(false);
                                setActiveTab(portal.tab!);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-[#F3F7FD] text-xs"
                            >
                              <div className="font-bold text-[#154792]">{portal.name}</div>
                              <div className="text-[11px] text-[#4679C0]">{portal.subtitle}</div>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sign In / Account Pill */}
              {user ? (
                <div className="flex items-center gap-1.5 ml-0.5">
                  {!isMobileLayout && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('status')}
                      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#FBE95C] whitespace-nowrap max-w-[140px] truncate"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#FBE95C] shrink-0" />
                      <span className="truncate">{user.name}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={`${
                      isMobileLayout ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-1.5 text-xs'
                    } rounded-full bg-[#FBE95C] hover:bg-[#f7e135] font-extrabold text-[#154792] whitespace-nowrap shrink-0 inline-flex items-center gap-1 transition-colors`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {!isMobileLayout && t.signOut}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthContextMessage(undefined);
                    setActiveTab('auth');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`${
                    isMobileLayout ? 'px-3 py-1.5 text-[11px]' : 'ml-1 px-4 py-1.5 text-xs'
                  } rounded-full bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] font-extrabold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
                >
                  {t.signIn}
                </button>
              )}
            </div>
          </div>
        </header>

        {liveToast && (
          <div
            className={`${
              isDesktopPhoneFrame ? 'absolute bottom-20 left-3 right-3' : 'fixed bottom-20 md:bottom-5 right-4 left-4 md:left-auto md:max-w-sm'
            } z-40 bg-[#154792] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#FBE95C]/60 text-xs font-bold`}
          >
            {liveToast}
          </div>
        )}

        {/* Scrollable Content Area */}
        <main
          className={`flex-1 w-full ${
            isDesktopPhoneFrame ? 'overflow-y-auto pb-20' : isMobileLayout ? 'pb-20' : ''
          }`}
        >
          {loadingInitial ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
              <div className="h-44 bg-[#F3F7FD] rounded-2xl" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 h-[380px] bg-[#F3F7FD] rounded-2xl" />
                <div className="lg:col-span-5 h-[380px] bg-[#F3F7FD] rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'auth' && (
                <AuthPage
                  onSuccess={handleAuthSuccess}
                  onCancel={() => {
                    setPendingDraft(null);
                    setActiveTab('home');
                  }}
                  contextMessage={authContextMessage}
                  isMobileView={isMobileLayout}
                />
              )}

              {activeTab === 'home' && (
                <ComplaintIntake
                  user={user}
                  token={token}
                  lang={lang}
                  reports={reports}
                  forceGuidedMode={forceGuidedMode}
                  onConsumeForceGuidedMode={() => setForceGuidedMode(false)}
                  pendingDraftToSubmit={pendingDraft}
                  onClearPendingDraft={() => setPendingDraft(null)}
                  onRequireAuth={(draft) => {
                    setPendingDraft(draft);
                    setAuthContextMessage('Sign in to submit your San Mateo report.');
                    setActiveTab('auth');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onReportSubmitted={(created) => {
                    setReports((prev) =>
                      prev.some((r) => r.id === created.id) ? prev : [created, ...prev]
                    );
                  }}
                  onNavigateToStatus={openStatusForReport}
                  onNavigateToMap={openMapForReport}
                  onNavigateToHotlines={() => setActiveTab('notices')}
                  isMobileView={isMobileLayout}
                />
              )}

              {activeTab === 'status' && (
                <StatusDashboard
                  reports={reports}
                  user={user}
                  token={token}
                  lang={lang}
                  sseConnected={sseConnected}
                  selectedReportId={selectedReportId}
                  onSelectReport={setSelectedReportId}
                  onReportUpdated={(updated) => {
                    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  }}
                  onViewOnMap={openMapForReport}
                  onRequireAuth={() => {
                    setAuthContextMessage('Sign in as LGU Staff or Citizen Resident.');
                    setActiveTab('auth');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  isMobileView={isMobileLayout}
                />
              )}

              {activeTab === 'map' && (
                <MapExplorerView
                  reports={reports}
                  user={user}
                  token={token}
                  lang={lang}
                  highlightedReportId={selectedReportId}
                  onTrackReport={openStatusForReport}
                  onReportUpdated={(updated) => {
                    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  }}
                  isMobileView={isMobileLayout}
                />
              )}

              {activeTab === 'notices' && (
                <HotlinesAndNotices
                  announcements={announcements}
                  user={user}
                  token={token}
                  lang={lang}
                  onAnnouncementCreated={(ann) => {
                    setAnnouncements((prev) =>
                      prev.some((a) => a.id === ann.id) ? prev : [ann, ...prev]
                    );
                  }}
                  isMobileView={isMobileLayout}
                />
              )}
            </>
          )}

          {/* Deep Civic Navy Footer (#154792) */}
          <footer className="bg-[#154792] text-[#D6E6FB]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FEFFFE] p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/E-sumbong_logo_dfdc32ee.png"
                    alt="e-Sumbong Mo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-extrabold text-white">e-Sumbong Mo</span>
                <span className="text-[#FBE95C]">•</span>
                <span>San Mateo, Rizal</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="hover:text-[#FBE95C] transition-colors"
                >
                  {t.navHome}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('status')}
                  className="hover:text-[#FBE95C] transition-colors"
                >
                  Live Status
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="hover:text-[#FBE95C] transition-colors"
                >
                  {t.navMap}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className="hover:text-[#FBE95C] transition-colors"
                >
                  911 &amp; 8888
                </button>
              </div>
            </div>
          </footer>
        </main>

        {/* Native Mobile App Bottom Navigation Bar (shown on < md screens or when Mobile Version is active) */}
        {isMobileLayout && (
          <nav
            aria-label="Mobile navigation"
            className={`${
              isDesktopPhoneFrame ? 'absolute bottom-0 inset-x-0' : 'fixed bottom-0 inset-x-0 md:hidden'
            } z-30 bg-[#FEFFFE]/95 backdrop-blur border-t border-[#d6e4f7] shadow-[0_-6px_24px_rgba(21,71,146,0.12)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-end`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold transition-colors ${
                activeTab === 'home' ? 'text-[#1177F0]' : 'text-[#4679C0]'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold transition-colors ${
                activeTab === 'status' ? 'text-[#1177F0]' : 'text-[#4679C0]'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Status</span>
            </button>

            {/* Center Elevated Primary Report CTA */}
            <button
              type="button"
              onClick={goToFileReport}
              className="flex flex-col items-center -mt-4 gap-1 text-[10px] font-extrabold text-[#154792]"
            >
              <span className="w-12 h-12 rounded-2xl bg-[#1177F0] border-[3px] border-[#FBE95C] text-white shadow-lg shadow-[#1177F0]/35 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </span>
              <span>Report</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold transition-colors ${
                activeTab === 'map' ? 'text-[#1177F0]' : 'text-[#4679C0]'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span>Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notices')}
              className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold transition-colors ${
                activeTab === 'notices' ? 'text-[#1177F0]' : 'text-[#4679C0]'
              }`}
            >
              <PhoneCall className="w-5 h-5" />
              <span>Hotlines</span>
            </button>
          </nav>
        )}

        <SupportChatDrawer
          isOpen={supportOpen}
          onClose={() => setSupportOpen(false)}
          lang={lang}
          onTrackReport={openStatusForReport}
          onStartGuidedReport={() => {
            setActiveTab('home');
            setForceGuidedMode(true);
          }}
        />
      </div>
    </div>
  );
}
