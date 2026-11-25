export type LanguageCode = 'en' | 'tl';

export const TRANSLATIONS: Record<
  LanguageCode,
  {
    navHome: string;
    navReport: string;
    navMap: string;
    navHotlines: string;
    signIn: string;
    signOut: string;
    heroHeadline: string;
    searchPlaceholder: string;
    weatherAdvisory: string;
    step1Label: string;
    step2Label: string;
    step3Label: string;
    evidenceDropTitle: string;
    evidenceDropHint: string;
    guidedChatLabel: string;
    standardFormLabel: string;
    autoCategorize: string;
    analyzing: string;
    useGps: string;
    locating: string;
    barangayLabel: string;
    submitReport: string;
    submitting: string;
    nextStep: string;
    backStep: string;
    recentFeedTitle: string;
    liveTrackingTitle: string;
    openDashboard: string;
    acknowledgedTag: string;
    resolvedTag: string;
    statusTitle: string;
    mapExplorerTitle: string;
    hotlinesTitle: string;
    layerIncidents: string;
    layerClosures: string;
    layerFacilities: string;
  }
> = {
  en: {
    navHome: 'Home',
    navReport: 'File a Report',
    navMap: 'Incident Map',
    navHotlines: 'Hotlines & Notices',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    heroHeadline: 'Serving San Mateo with Transparency and Action',
    searchPlaceholder: 'Search report ID, street, or road closures...',
    weatherAdvisory: '31°C Partly Cloudy • San Mateo, Rizal | 2 Active Road Closures',
    step1Label: 'Evidence & Category',
    step2Label: 'Pin Location',
    step3Label: 'Review & Submit',
    evidenceDropTitle: 'Snap Photo / Record Video',
    evidenceDropHint: 'JPG, PNG, WebP, MP4 or WebM up to 11MB',
    guidedChatLabel: 'AI Guided Chat',
    standardFormLabel: 'Step Form',
    autoCategorize: 'AI Auto-Categorize',
    analyzing: 'Analyzing...',
    useGps: 'Use My GPS',
    locating: 'Locating...',
    barangayLabel: 'San Mateo Barangay',
    submitReport: 'Submit Report',
    submitting: 'Submitting...',
    nextStep: 'Continue',
    backStep: 'Back',
    recentFeedTitle: 'Live San Mateo Reports',
    liveTrackingTitle: 'Live Resolution Tracking',
    openDashboard: 'Full Status View',
    acknowledgedTag: 'ACKNOWLEDGED',
    resolvedTag: 'RESOLVED',
    statusTitle: 'Live Resolution Tracking',
    mapExplorerTitle: 'San Mateo Incident Map',
    hotlinesTitle: 'Hotlines & Municipal Notices',
    layerIncidents: 'Reported Incidents',
    layerClosures: "Gov't Road Closures",
    layerFacilities: 'Essential Facilities',
  },
  tl: {
    navHome: 'Tahanan',
    navReport: 'Mag-ulat',
    navMap: 'Mapa ng Ulat',
    navHotlines: 'Hotline at Abiso',
    signIn: 'Mag-sign In',
    signOut: 'Mag-sign Out',
    heroHeadline: 'Naglilingkod sa San Mateo nang may Aksyon at Linaw',
    searchPlaceholder: 'Hanapin ang report ID, kalye, o saradong daan...',
    weatherAdvisory: '31°C Bahagyang Maulap • San Mateo, Rizal | 2 Saradong Kalsada',
    step1Label: 'Ebidensya at Kategorya',
    step2Label: 'Ituro ang Lugar',
    step3Label: 'Suriin at Isumite',
    evidenceDropTitle: 'Kumuha ng Larawan / Video',
    evidenceDropHint: 'JPG, PNG, WebP, MP4 o WebM hanggang 11MB',
    guidedChatLabel: 'AI Guided Chat',
    standardFormLabel: 'Hakbang Form',
    autoCategorize: 'AI Auto-Categorize',
    analyzing: 'Sinusuri...',
    useGps: 'Gamitin ang GPS',
    locating: 'Hinahanap...',
    barangayLabel: 'Barangay sa San Mateo',
    submitReport: 'Isumite ang Ulat',
    submitting: 'Isinusumite...',
    nextStep: 'Magpatuloy',
    backStep: 'Bumalik',
    recentFeedTitle: 'Mga Live na Ulat sa San Mateo',
    liveTrackingTitle: 'Live na Pagsubaybay',
    openDashboard: 'Buong Status View',
    acknowledgedTag: 'KINILALA',
    resolvedTag: 'NALUTAS NA',
    statusTitle: 'Live na Pagsubaybay ng Ulat',
    mapExplorerTitle: 'Mapa ng Insidente sa San Mateo',
    hotlinesTitle: 'Mga Hotline at Abiso',
    layerIncidents: 'Mga Iniulat na Insidente',
    layerClosures: 'Saradong Kalsada',
    layerFacilities: 'Mahalagang Pasilidad',
  },
};
