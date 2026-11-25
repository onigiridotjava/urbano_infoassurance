export type UserRole = 'citizen' | 'lgu_officer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  barangay: string;
  department?: string;
}

export type ReportClass = 'non_hazard' | 'safety_hazard';

export type ReportCategory =
  | 'Trash & Collection'
  | 'Double Parking & Driveway'
  | 'Road Closure & Events'
  | 'Drinking Water & Leaks'
  | 'Animal Welfare'
  | 'Pests, Trees & Vandalism'
  | 'Road Damage / Pothole'
  | 'Street Flooding'
  | 'Broken Streetlight';

export type ReportStatus =
  | 'submitted'
  | 'triaged'
  | 'assigned'
  | 'in_progress'
  | 'resolved';

export type LguDepartment =
  | 'San Mateo Solid Waste & Sanitation'
  | 'Traffic Management & Ordinance'
  | 'Municipal Engineering Office'
  | 'Waterworks & Utilities Desk'
  | 'Veterinary & Animal Welfare'
  | 'Parks, Forestry & Pest Control'
  | 'DRRMO Flood & Safety Unit';

export interface TimelineEntry {
  status: ReportStatus;
  timestamp: string;
  actor: string;
  note: string;
  photoUrl?: string;
}

export interface AiAnalysis {
  suggestedClass: ReportClass;
  suggestedCategory: ReportCategory;
  suggestedDepartment: LguDepartment;
  severity: 'Low' | 'Moderate' | 'Urgent';
  confidence: number;
  summary: string;
  duplicateOfId?: string | null;
  duplicateReason?: string | null;
  source: 'gemini' | 'heuristic';
}

export interface ReportFeedback {
  rating: number;
  comment: string;
  submittedAt: string;
}

export interface IncidentReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reportClass: ReportClass;
  category: ReportCategory;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaName: string;
  resolutionMediaUrl?: string;
  lat: number;
  lng: number;
  addressLabel: string;
  barangay: string;
  status: ReportStatus;
  assignedDepartment: LguDepartment;
  aiAnalysis?: AiAnalysis;
  timeline: TimelineEntry[];
  feedback?: ReportFeedback;
  createdAt: string;
  updatedAt: string;
}

export interface CityAnnouncement {
  id: string;
  title: string;
  category: 'Road Closure' | 'Planned Maintenance' | 'Weather Advisory' | 'Municipal Notice';
  barangayScope: string;
  message: string;
  authorName: string;
  createdAt: string;
}

export interface RoadClosureMarker {
  id: string;
  title: string;
  street: string;
  schedule: string;
  reason: string;
  lat: number;
  lng: number;
}

export interface EssentialFacility {
  id: string;
  name: string;
  type: 'Barangay Hall' | 'Health Clinic' | 'Fire Station' | 'Police Station';
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

export const SAN_MATEO_BARANGAYS = [
  'Guitnang Bayan I',
  'Guitnang Bayan II',
  'Dulong Bayan I',
  'Dulong Bayan II',
  'Ampid I',
  'Ampid II',
  'Banaba',
  'Malanday',
  'Sta. Ana',
  'Sto. Niño',
  'Silangan',
  'Guinayang',
  'Maly',
  'Gulod Malaya',
  'Pintong Bukawe',
] as const;

export const OVERLAPPING_CATEGORIES: {
  label: ReportCategory;
  shortTitle: string;
  tlTitle: string;
  reportClass: ReportClass;
  defaultDept: LguDepartment;
  iconKey: 'trash' | 'parking' | 'road_closure' | 'water' | 'animal' | 'pests';
}[] = [
  {
    label: 'Trash & Collection',
    shortTitle: 'Trash & Collection',
    tlTitle: 'Basura at Koleksyon',
    reportClass: 'non_hazard',
    defaultDept: 'San Mateo Solid Waste & Sanitation',
    iconKey: 'trash',
  },
  {
    label: 'Double Parking & Driveway',
    shortTitle: 'Double Parking & Driveway',
    tlTitle: 'Double Parking at Daan',
    reportClass: 'non_hazard',
    defaultDept: 'Traffic Management & Ordinance',
    iconKey: 'parking',
  },
  {
    label: 'Road Closure & Events',
    shortTitle: 'Road Closure & Events',
    tlTitle: 'Saradong Kalsada',
    reportClass: 'non_hazard',
    defaultDept: 'Traffic Management & Ordinance',
    iconKey: 'road_closure',
  },
  {
    label: 'Drinking Water & Leaks',
    shortTitle: 'Drinking Water & Leaks',
    tlTitle: 'Tubig at Tagas ng Tubo',
    reportClass: 'safety_hazard',
    defaultDept: 'Waterworks & Utilities Desk',
    iconKey: 'water',
  },
  {
    label: 'Animal Welfare',
    shortTitle: 'Animal Welfare',
    tlTitle: 'Kapakanan ng Hayop',
    reportClass: 'non_hazard',
    defaultDept: 'Veterinary & Animal Welfare',
    iconKey: 'animal',
  },
  {
    label: 'Pests, Trees & Vandalism',
    shortTitle: 'Pests, Trees & Vandalism',
    tlTitle: 'Peste, Puno at Bandalismo',
    reportClass: 'non_hazard',
    defaultDept: 'Parks, Forestry & Pest Control',
    iconKey: 'pests',
  },
];

export const LGU_DEPARTMENTS: LguDepartment[] = [
  'San Mateo Solid Waste & Sanitation',
  'Traffic Management & Ordinance',
  'Municipal Engineering Office',
  'Waterworks & Utilities Desk',
  'Parks, Forestry & Pest Control',
  'Veterinary & Animal Welfare',
  'DRRMO Flood & Safety Unit',
];

export const STATUS_STEPS: {
  key: ReportStatus;
  label: string;
  tlLabel: string;
  milestoneLabel: string;
}[] = [
  {
    key: 'submitted',
    label: 'Submitted',
    tlLabel: 'Naisumite',
    milestoneLabel: 'Submitted',
  },
  {
    key: 'triaged',
    label: 'Acknowledged',
    tlLabel: 'Kinilala',
    milestoneLabel: 'AI Triaged & Duplicate Checked',
  },
  {
    key: 'assigned',
    label: 'Dispatched',
    tlLabel: 'Itinalaga',
    milestoneLabel: 'Dispatched to LGU Crew',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    tlLabel: 'Inaayos na',
    milestoneLabel: 'Crew On-Site',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    tlLabel: 'Nalutas na',
    milestoneLabel: 'Resolved',
  },
];

export const ROAD_CLOSURES: RoadClosureMarker[] = [
  {
    id: 'RC-SM-01',
    title: 'Gen. Luna Ave. Drainage Clearing',
    street: 'Gen. Luna Ave. near Guitnang Bayan I',
    schedule: 'Sat 6:00 AM – 1:00 PM',
    reason: 'Municipal Engineering storm drain desilting',
    lat: 14.6978,
    lng: 121.1198,
  },
  {
    id: 'RC-SM-02',
    title: 'Town Plaza Civic Caravan',
    street: 'B. Mariano St., Sta. Ana, San Mateo',
    schedule: 'Sun 7:00 AM – 3:00 PM',
    reason: 'San Mateo Municipal Outreach & Health Caravan',
    lat: 14.6952,
    lng: 121.1235,
  },
];

export const ESSENTIAL_FACILITIES: EssentialFacility[] = [
  {
    id: 'FAC-SM-01',
    name: 'San Mateo Municipal Hall & Brgy. Guitnang Bayan',
    type: 'Barangay Hall',
    address: 'Gen. Luna Ave., Guitnang Bayan I, San Mateo, Rizal',
    phone: '(02) 8941-2240',
    lat: 14.6967,
    lng: 121.1219,
  },
  {
    id: 'FAC-SM-02',
    name: 'San Mateo Municipal Health Clinic',
    type: 'Health Clinic',
    address: 'M.H. Del Pilar St., Guitnang Bayan II, San Mateo',
    phone: '(02) 8941-3318',
    lat: 14.6989,
    lng: 121.1246,
  },
  {
    id: 'FAC-SM-03',
    name: 'BFP San Mateo Fire Station',
    type: 'Fire Station',
    address: 'Gen. Luna Ave., Ampid I, San Mateo, Rizal',
    phone: '(02) 8942-1190',
    lat: 14.6878,
    lng: 121.1156,
  },
  {
    id: 'FAC-SM-04',
    name: 'San Mateo Municipal Police Station',
    type: 'Police Station',
    address: 'J.P. Rizal St., Sta. Ana, San Mateo, Rizal',
    phone: '(02) 8941-7755',
    lat: 14.6944,
    lng: 121.1202,
  },
];

export const EMERGENCY_HOTLINES = [
  {
    name: 'National Emergency Hotline',
    number: '911',
    scope: 'Life-threatening emergencies, fires, crime & medical response',
    note: 'Immediate emergency dispatch.',
  },
  {
    name: "8888 Citizens' Complaint Hotline",
    number: '8888',
    scope: 'National government agency service & public assistance',
    note: '24/7 Malacañang public assistance channel.',
  },
  {
    name: 'San Mateo MDRRMO Rescue',
    number: '(02) 8941-2240',
    scope: 'Flood monitoring, Marikina River alerts & municipal rescue',
    note: 'San Mateo Municipal Disaster Risk Reduction Office.',
  },
  {
    name: 'San Mateo Fire & Police Desk',
    number: '(02) 8942-1190',
    scope: 'Local fire response & barangay peace and order',
    note: '24/7 San Mateo dispatch line.',
  },
];
