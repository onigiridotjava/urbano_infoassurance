import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type {
  AiAnalysis,
  CityAnnouncement,
  IncidentReport,
  LguDepartment,
  ReportCategory,
  ReportClass,
  ReportStatus,
  User,
  UserRole,
} from './src/types/report.ts';

const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface StoredUser extends User {
  passwordHash: string;
}

interface DatabaseSchema {
  schemaVersion?: number;
  users: StoredUser[];
  reports: IncidentReport[];
  announcements: CityAnnouncement[];
  sessionSecret: string;
}

function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(originalHash, 'hex'));
}

function createInitialDb(): DatabaseSchema {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  const users: StoredUser[] = [
    {
      id: 'usr_citizen_1',
      name: 'Katelyn Urbano',
      email: 'katelyn.urbano@gmail.com',
      role: 'citizen',
      barangay: 'Guitnang Bayan I',
      passwordHash: hashPassword('citizen2026'),
    },
    {
      id: 'usr_citizen_2',
      name: 'John Carlo Cabral',
      email: 'jc.cabral@gmail.com',
      role: 'citizen',
      barangay: 'Ampid I',
      passwordHash: hashPassword('citizen2026'),
    },
    {
      id: 'usr_lgu_1',
      name: 'Engr. Marco Villanueva',
      email: 'dispatch@sanmateo.gov.ph',
      role: 'lgu_officer',
      barangay: 'Guitnang Bayan I',
      department: 'Municipal Engineering Office',
      passwordHash: hashPassword('officer2026'),
    },
  ];

  const reports: IncidentReport[] = [
    {
      id: 'ESM-SM-0106',
      reporterId: 'usr_citizen_1',
      reporterName: 'Katelyn Urbano',
      reporterEmail: 'katelyn.urbano@gmail.com',
      reportClass: 'non_hazard',
      category: 'Trash & Collection',
      title: 'Delayed morning collection along Gen. Luna Ave.',
      description:
        'Household waste sacks waiting at the corner pickup station since 6:30 AM near Guitnang Bayan I market.',
      mediaUrl: '/assets/evidence/waste_report.svg',
      mediaType: 'image',
      mediaName: 'gen_luna_trash.svg',
      lat: 14.6972,
      lng: 121.1211,
      addressLabel: 'Gen. Luna Ave., Guitnang Bayan I, San Mateo',
      barangay: 'Guitnang Bayan I',
      status: 'in_progress',
      assignedDepartment: 'San Mateo Solid Waste & Sanitation',
      aiAnalysis: {
        suggestedClass: 'non_hazard',
        suggestedCategory: 'Trash & Collection',
        suggestedDepartment: 'San Mateo Solid Waste & Sanitation',
        severity: 'Moderate',
        confidence: 0.96,
        summary: 'Sanitation pickup delay along Gen. Luna Ave.',
        duplicateOfId: null,
        duplicateReason: null,
        source: 'heuristic',
      },
      timeline: [
        {
          status: 'submitted',
          timestamp: minsAgo(140),
          actor: 'Katelyn Urbano',
          note: 'Photo evidence uploaded with GPS pin.',
        },
        {
          status: 'triaged',
          timestamp: minsAgo(138),
          actor: 'AI Intake Triage',
          note: 'Categorized under Trash & Collection; zero duplicate reports found.',
        },
        {
          status: 'assigned',
          timestamp: minsAgo(90),
          actor: 'Engr. Marco Villanueva',
          note: 'Dispatched to San Mateo Solid Waste Truck #04.',
        },
        {
          status: 'in_progress',
          timestamp: minsAgo(22),
          actor: 'Sanitation Crew #04',
          note: 'Collection crew arrived along Gen. Luna Ave.',
        },
      ],
      createdAt: minsAgo(140),
      updatedAt: minsAgo(22),
    },
    {
      id: 'ESM-SM-0105',
      reporterId: 'usr_citizen_2',
      reporterName: 'John Carlo Cabral',
      reporterEmail: 'jc.cabral@gmail.com',
      reportClass: 'non_hazard',
      category: 'Double Parking & Driveway',
      title: 'Delivery van blocking residential driveway in Ampid I',
      description:
        'Commercial delivery vehicle double-parked along Patiis Rd. junction blocking school foot traffic.',
      mediaUrl: '/assets/evidence/sidewalk_report.svg',
      mediaType: 'image',
      mediaName: 'ampid_double_park.svg',
      lat: 14.6884,
      lng: 121.1164,
      addressLabel: 'Patiis Rd. cor. Gen. Luna, Ampid I, San Mateo',
      barangay: 'Ampid I',
      status: 'assigned',
      assignedDepartment: 'Traffic Management & Ordinance',
      aiAnalysis: {
        suggestedClass: 'non_hazard',
        suggestedCategory: 'Double Parking & Driveway',
        suggestedDepartment: 'Traffic Management & Ordinance',
        severity: 'Low',
        confidence: 0.94,
        summary: 'Sidewalk & driveway obstruction near Ampid I junction.',
        duplicateOfId: null,
        duplicateReason: null,
        source: 'heuristic',
      },
      timeline: [
        {
          status: 'submitted',
          timestamp: minsAgo(200),
          actor: 'John Carlo Cabral',
          note: 'Photo evidence submitted.',
        },
        {
          status: 'triaged',
          timestamp: minsAgo(198),
          actor: 'AI Intake Triage',
          note: 'Classified as Double Parking & Driveway.',
        },
        {
          status: 'assigned',
          timestamp: minsAgo(65),
          actor: 'Engr. Marco Villanueva',
          note: 'Assigned to Traffic Management Patrol B.',
        },
      ],
      createdAt: minsAgo(200),
      updatedAt: minsAgo(65),
    },
    {
      id: 'ESM-SM-0104',
      reporterId: 'usr_citizen_1',
      reporterName: 'Katelyn Urbano',
      reporterEmail: 'katelyn.urbano@gmail.com',
      reportClass: 'safety_hazard',
      category: 'Drinking Water & Leaks',
      title: 'Clean water main valve leak on M.H. Del Pilar St.',
      description:
        'Pressurized pipe valve leaking across the gutter near Guitnang Bayan II residential block.',
      mediaUrl: '/assets/evidence/water_leak_report.svg',
      mediaType: 'image',
      mediaName: 'del_pilar_leak.svg',
      lat: 14.6991,
      lng: 121.1238,
      addressLabel: 'M.H. Del Pilar St., Guitnang Bayan II, San Mateo',
      barangay: 'Guitnang Bayan II',
      status: 'triaged',
      assignedDepartment: 'Waterworks & Utilities Desk',
      aiAnalysis: {
        suggestedClass: 'safety_hazard',
        suggestedCategory: 'Drinking Water & Leaks',
        suggestedDepartment: 'Waterworks & Utilities Desk',
        severity: 'Urgent',
        confidence: 0.95,
        summary: 'Water main leak routed to Waterworks & Utilities Desk.',
        duplicateOfId: 'ESM-SM-0102',
        duplicateReason: 'Possible nearby infrastructure report ESM-SM-0102 within 250m.',
        source: 'heuristic',
      },
      timeline: [
        {
          status: 'submitted',
          timestamp: minsAgo(48),
          actor: 'Katelyn Urbano',
          note: 'Submitted photo evidence and GPS tag.',
        },
        {
          status: 'triaged',
          timestamp: minsAgo(47),
          actor: 'AI Intake Triage',
          note: 'Acknowledged & routed to Waterworks & Utilities Desk.',
        },
      ],
      createdAt: minsAgo(48),
      updatedAt: minsAgo(47),
    },
    {
      id: 'ESM-SM-0103',
      reporterId: 'usr_citizen_2',
      reporterName: 'John Carlo Cabral',
      reporterEmail: 'jc.cabral@gmail.com',
      reportClass: 'non_hazard',
      category: 'Pests, Trees & Vandalism',
      title: 'Overgrown acacia branches near Dulong Bayan II school gate',
      description:
        'Low-hanging tree canopy touching streetlamp arm and obscuring pedestrian signage.',
      mediaUrl: '/assets/evidence/tree_greenery_report.svg',
      mediaType: 'image',
      mediaName: 'dulong_bayan_trees.svg',
      resolutionMediaUrl: '/assets/evidence/tree_greenery_report.svg',
      lat: 14.7024,
      lng: 121.1258,
      addressLabel: 'Daang Bakal St., Dulong Bayan II, San Mateo',
      barangay: 'Dulong Bayan II',
      status: 'resolved',
      assignedDepartment: 'Parks, Forestry & Pest Control',
      aiAnalysis: {
        suggestedClass: 'non_hazard',
        suggestedCategory: 'Pests, Trees & Vandalism',
        suggestedDepartment: 'Parks, Forestry & Pest Control',
        severity: 'Moderate',
        confidence: 0.93,
        summary: 'Tree canopy pruning near Dulong Bayan II.',
        duplicateOfId: null,
        duplicateReason: null,
        source: 'heuristic',
      },
      timeline: [
        {
          status: 'submitted',
          timestamp: minsAgo(1440),
          actor: 'John Carlo Cabral',
          note: 'Uploaded photo evidence.',
        },
        {
          status: 'triaged',
          timestamp: minsAgo(1435),
          actor: 'AI Intake Triage',
          note: 'Acknowledged & checked for duplicates.',
        },
        {
          status: 'assigned',
          timestamp: minsAgo(1100),
          actor: 'Engr. Marco Villanueva',
          note: 'Dispatched to Parks & Forestry Pruning Team.',
        },
        {
          status: 'resolved',
          timestamp: minsAgo(360),
          actor: 'Forestry Crew A',
          note: 'Branches trimmed safely and cleared from lamp post.',
        },
      ],
      feedback: {
        rating: 5,
        comment: 'Very clean work by the San Mateo forestry crew.',
        submittedAt: minsAgo(240),
      },
      createdAt: minsAgo(1440),
      updatedAt: minsAgo(240),
    },
    {
      id: 'ESM-SM-0102',
      reporterId: 'usr_citizen_1',
      reporterName: 'Katelyn Urbano',
      reporterEmail: 'katelyn.urbano@gmail.com',
      reportClass: 'safety_hazard',
      category: 'Road Damage / Pothole',
      title: 'Water-filled asphalt pothole along J.P. Rizal St., Sta. Ana',
      description: 'Road depression holding standing water near tricycle terminal.',
      mediaUrl: '/assets/evidence/pothole_report.svg',
      mediaType: 'image',
      mediaName: 'sta_ana_pothole.svg',
      lat: 14.6956,
      lng: 121.1208,
      addressLabel: 'J.P. Rizal St., Sta. Ana, San Mateo',
      barangay: 'Sta. Ana',
      status: 'assigned',
      assignedDepartment: 'Municipal Engineering Office',
      aiAnalysis: {
        suggestedClass: 'safety_hazard',
        suggestedCategory: 'Road Damage / Pothole',
        suggestedDepartment: 'Municipal Engineering Office',
        severity: 'Urgent',
        confidence: 0.97,
        summary: 'Road surface patching required in Sta. Ana.',
        duplicateOfId: null,
        duplicateReason: null,
        source: 'heuristic',
      },
      timeline: [
        {
          status: 'submitted',
          timestamp: minsAgo(310),
          actor: 'Katelyn Urbano',
          note: 'Photo evidence uploaded.',
        },
        {
          status: 'triaged',
          timestamp: minsAgo(308),
          actor: 'AI Intake Triage',
          note: 'Routed to Municipal Engineering Office.',
        },
        {
          status: 'assigned',
          timestamp: minsAgo(160),
          actor: 'Engr. Marco Villanueva',
          note: 'Scheduled for cold-mix asphalt patching.',
        },
      ],
      createdAt: minsAgo(310),
      updatedAt: minsAgo(160),
    },
  ];

  const announcements: CityAnnouncement[] = [
    {
      id: 'ANN-SM-02',
      title: 'Gen. Luna Ave. Storm Drain Desilting Schedule',
      category: 'Road Closure',
      barangayScope: 'Guitnang Bayan I & II',
      message:
        'Outer lane clearing runs Saturday 6:00 AM – 1:00 PM near Municipal Hall. Follow traffic enforcer detours.',
      authorName: 'Municipal Engineering Office',
      createdAt: minsAgo(280),
    },
    {
      id: 'ANN-SM-01',
      title: 'San Mateo Sunday Civic Health & Animal Welfare Caravan',
      category: 'Municipal Notice',
      barangayScope: 'Sta. Ana & Ampid I',
      message:
        'Free anti-rabies vaccination and barangay consultation at Town Plaza from 7:00 AM to 3:00 PM.',
      authorName: 'San Mateo LGU Public Desk',
      createdAt: minsAgo(1600),
    },
  ];

  return {
    schemaVersion: 3,
    users,
    reports,
    announcements,
    sessionSecret: crypto.randomBytes(32).toString('hex'),
  };
}

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if ((parsed.schemaVersion || 1) < 3) {
      const upgraded = createInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(upgraded, null, 2), 'utf-8');
      return upgraded;
    }
    return parsed;
  } catch {
    const fallback = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

let db: DatabaseSchema = loadDb();

function saveDb() {
  const tmpPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE);
}

const sseClients = new Set<Response>();
function broadcastEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function signToken(user: StoredUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', db.sessionSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): StoredUser | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto
      .createHmac('sha256', db.sessionSecret)
      .update(payload)
      .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      id: string;
      exp: number;
    };
    if (decoded.exp < Date.now()) return null;
    return db.users.find((u) => u.id === decoded.id) || null;
  } catch {
    return null;
  }
}

function sanitizeUser(user: StoredUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    barangay: user.barangay,
    department: user.department,
  };
}

interface AuthedRequest extends Request {
  user?: StoredUser;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  req.user = user;
  next();
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function heuristicAnalyze(
  description: string,
  lat: number,
  lng: number,
  preferredClass?: ReportClass
): AiAnalysis {
  const text = description.toLowerCase();

  let suggestedClass: ReportClass = preferredClass || 'non_hazard';
  let suggestedCategory: ReportCategory = 'Trash & Collection';
  let suggestedDepartment: LguDepartment = 'San Mateo Solid Waste & Sanitation';
  let severity: 'Low' | 'Moderate' | 'Urgent' = 'Low';

  if (/(pothole|asphalt|road crack|manhole|lubak)/i.test(text)) {
    suggestedClass = 'safety_hazard';
    suggestedCategory = 'Road Damage / Pothole';
    suggestedDepartment = 'Municipal Engineering Office';
    severity = 'Urgent';
  } else if (/(flood|baha|submerged|deep water)/i.test(text)) {
    suggestedClass = 'safety_hazard';
    suggestedCategory = 'Street Flooding';
    suggestedDepartment = 'DRRMO Flood & Safety Unit';
    severity = 'Urgent';
  } else if (/(streetlight|lamp|dark street|poste)/i.test(text)) {
    suggestedClass = 'safety_hazard';
    suggestedCategory = 'Broken Streetlight';
    suggestedDepartment = 'Municipal Engineering Office';
    severity = 'Moderate';
  } else if (/(water|pipe|leak|tubo|tagas|hydrant)/i.test(text)) {
    suggestedClass = 'safety_hazard';
    suggestedCategory = 'Drinking Water & Leaks';
    suggestedDepartment = 'Waterworks & Utilities Desk';
    severity = 'Urgent';
  } else if (/(animal|dog|cat|pet|stray|abuse|abandon|aso|pusa)/i.test(text)) {
    suggestedClass = 'non_hazard';
    suggestedCategory = 'Animal Welfare';
    suggestedDepartment = 'Veterinary & Animal Welfare';
    severity = 'Moderate';
  } else if (/(pest|rat|mosquito|dengue|tree|branch|vandal|graffiti|sign|puno)/i.test(text)) {
    suggestedClass = 'non_hazard';
    suggestedCategory = 'Pests, Trees & Vandalism';
    suggestedDepartment = 'Parks, Forestry & Pest Control';
    severity = 'Moderate';
  } else if (/(closure|barricade|event|parade|fiesta|detour)/i.test(text)) {
    suggestedClass = 'non_hazard';
    suggestedCategory = 'Road Closure & Events';
    suggestedDepartment = 'Traffic Management & Ordinance';
    severity = 'Low';
  } else if (/(double park|driveway|sidewalk|parked|obstruction|blocked|van)/i.test(text)) {
    suggestedClass = 'non_hazard';
    suggestedCategory = 'Double Parking & Driveway';
    suggestedDepartment = 'Traffic Management & Ordinance';
    severity = 'Low';
  } else if (/(garbage|trash|basura|waste|collection|bin)/i.test(text)) {
    suggestedClass = 'non_hazard';
    suggestedCategory = 'Trash & Collection';
    suggestedDepartment = 'San Mateo Solid Waste & Sanitation';
    severity = 'Moderate';
  }

  let duplicateOfId: string | null = null;
  let duplicateReason: string | null = null;
  for (const r of db.reports) {
    if (r.status === 'resolved') continue;
    const dist = haversineMeters(lat, lng, r.lat, r.lng);
    if (dist <= 240 && r.category === suggestedCategory) {
      duplicateOfId = r.id;
      duplicateReason = `Matches open ${r.category} report ${r.id} roughly ${Math.round(dist)}m away.`;
      break;
    }
  }

  return {
    suggestedClass,
    suggestedCategory,
    suggestedDepartment,
    severity,
    confidence: 0.89,
    summary: `${suggestedCategory} routed to ${suggestedDepartment}.`,
    duplicateOfId,
    duplicateReason,
    source: 'heuristic',
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function analyzeWithGemini(
  description: string,
  lat: number,
  lng: number,
  mediaDataUrl?: string,
  preferredClass?: ReportClass
): Promise<AiAnalysis> {
  const ai = getGeminiClient();
  if (!ai) {
    return heuristicAnalyze(description, lat, lng, preferredClass);
  }

  try {
    const nearbyOpen = db.reports
      .filter((r) => r.status !== 'resolved')
      .map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        distanceMeters: Math.round(haversineMeters(lat, lng, r.lat, r.lng)),
      }))
      .filter((r) => r.distanceMeters <= 300)
      .slice(0, 6);

    const promptText = `You are the AI intake triage engine for "e-Sumbong Mo • San Mateo", Rizal.
Analyze the citizen's report description${mediaDataUrl ? ' and attached photo' : ''}.
Pick the exact category below:
- "Trash & Collection" (non_hazard -> San Mateo Solid Waste & Sanitation)
- "Double Parking & Driveway" (non_hazard -> Traffic Management & Ordinance)
- "Road Closure & Events" (non_hazard -> Traffic Management & Ordinance)
- "Drinking Water & Leaks" (safety_hazard -> Waterworks & Utilities Desk)
- "Animal Welfare" (non_hazard -> Veterinary & Animal Welfare)
- "Pests, Trees & Vandalism" (non_hazard -> Parks, Forestry & Pest Control)
- "Road Damage / Pothole" (safety_hazard -> Municipal Engineering Office)
- "Street Flooding" (safety_hazard -> DRRMO Flood & Safety Unit)
- "Broken Streetlight" (safety_hazard -> Municipal Engineering Office)

Citizen description: "${description || 'No description provided; classify based on attached media.'}"
Nearby open reports within 300m: ${JSON.stringify(nearbyOpen)}

If a nearby open report matches the same physical issue, set duplicateOfId and duplicateReason; else null.`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (mediaDataUrl && mediaDataUrl.startsWith('data:image/')) {
      const match = mediaDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match && !match[1].includes('svg')) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedClass: { type: Type.STRING },
            suggestedCategory: { type: Type.STRING },
            suggestedDepartment: { type: Type.STRING },
            severity: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            duplicateOfId: { type: Type.STRING, nullable: true },
            duplicateReason: { type: Type.STRING, nullable: true },
          },
          required: [
            'suggestedClass',
            'suggestedCategory',
            'suggestedDepartment',
            'severity',
            'confidence',
            'summary',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<AiAnalysis>;
    if (!parsed.suggestedCategory || !parsed.suggestedClass) {
      return heuristicAnalyze(description, lat, lng, preferredClass);
    }

    return {
      suggestedClass: parsed.suggestedClass === 'safety_hazard' ? 'safety_hazard' : 'non_hazard',
      suggestedCategory: parsed.suggestedCategory as ReportCategory,
      suggestedDepartment:
        (parsed.suggestedDepartment as LguDepartment) || 'Municipal Engineering Office',
      severity:
        parsed.severity === 'Urgent' || parsed.severity === 'Moderate' ? parsed.severity : 'Low',
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.min(0.99, Math.max(0.5, parsed.confidence))
          : 0.91,
      summary: parsed.summary || 'Categorized via Gemini AI intake triage.',
      duplicateOfId: parsed.duplicateOfId || null,
      duplicateReason: parsed.duplicateReason || null,
      source: 'gemini',
    };
  } catch {
    return heuristicAnalyze(description, lat, lng, preferredClass);
  }
}

function saveMediaFile(
  dataUrl: string,
  originalName: string
): { url: string; mediaType: 'image' | 'video' } {
  const match = dataUrl.match(/^data:((image|video)\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid media format. Please upload an image or short video file.');
  }
  const mime = match[1];
  const mediaType = match[2] === 'video' ? 'video' : 'image';
  const extRaw = mime.split('/')[1]?.split('+')[0] || (mediaType === 'video' ? 'mp4' : 'png');
  const ext = extRaw.replace(/[^a-z0-9]/gi, '') || 'bin';
  const safeBase = (originalName || 'evidence').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  const filename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeBase}.${ext}`;
  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error('Media file exceeds the 12MB upload limit.');
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return { url: `/uploads/${filename}`, mediaType };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '18mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(
      `event: connected\ndata: ${JSON.stringify({ ok: true, time: new Date().toISOString() })}\n\n`
    );
    sseClients.add(res);

    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(ping);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      sseClients.delete(res);
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, barangay } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      barangay?: string;
    };
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Name, valid email, and password (at least 6 characters) are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(5).toString('hex')}`,
      name: name.trim(),
      email: normalizedEmail,
      role: 'citizen' as UserRole,
      barangay: barangay?.trim() || 'Guitnang Bayan I',
      passwordHash: hashPassword(password),
    };
    db.users.push(newUser);
    saveDb();
    const token = signToken(newUser);
    res.status(201).json({ user: sanitizeUser(newUser), token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = signToken(user);
    res.json({ user: sanitizeUser(user), token });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.get('/api/geocode/reverse', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'e-Sumbong-Mo-SanMateo/1.0 (civic-reporting)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
      const data = (await response.json()) as {
        display_name?: string;
        address?: {
          road?: string;
          suburb?: string;
          neighbourhood?: string;
          quarter?: string;
          village?: string;
          town?: string;
        };
      };
      const addr = data.address || {};
      const road = addr.road || addr.neighbourhood || 'Gen. Luna Ave.';
      const district = addr.quarter || addr.suburb || addr.village || 'Guitnang Bayan I';
      const town = addr.town || 'San Mateo, Rizal';
      const addressLabel = `${road}, ${district}, ${town}`;
      return res.json({
        addressLabel,
        barangay: district,
        fullDisplay: data.display_name || addressLabel,
      });
    } catch {
      return res.json({
        addressLabel: `San Mateo Pin (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        barangay: 'Guitnang Bayan I',
        fullDisplay: `Coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    }
  });

  app.post('/api/ai/analyze-report', async (req, res) => {
    const { description, lat, lng, mediaDataUrl, preferredClass } = req.body as {
      description?: string;
      lat?: number;
      lng?: number;
      mediaDataUrl?: string;
      preferredClass?: ReportClass;
    };
    const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : 14.6967;
    const safeLng = Number.isFinite(Number(lng)) ? Number(lng) : 121.1219;
    const analysis = await analyzeWithGemini(
      description || '',
      safeLat,
      safeLng,
      mediaDataUrl,
      preferredClass
    );
    res.json({ analysis });
  });

  app.post('/api/ai/guided-intake', async (req, res) => {
    const { message, history, lat, lng, lang } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      lat?: number;
      lng?: number;
      lang?: 'en' | 'tl';
    };
    const userMsg = (message || '').trim();
    const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : 14.6967;
    const safeLng = Number.isFinite(Number(lng)) ? Number(lng) : 121.1219;

    const analysis = heuristicAnalyze(userMsg, safeLat, safeLng);
    const ai = getGeminiClient();
    if (!ai) {
      const reply =
        lang === 'tl'
          ? `Naikategorya ko ito sa "${analysis.suggestedCategory}" (${analysis.suggestedDepartment}). I-pin ang lugar sa mapa at maglakip ng larawan.`
          : `Categorized as ${analysis.suggestedCategory} for ${analysis.suggestedDepartment}. Confirm your map pin and photo evidence to submit.`;
      return res.json({
        reply,
        draftUpdate: {
          reportClass: analysis.suggestedClass,
          category: analysis.suggestedCategory,
          assignedDepartment: analysis.suggestedDepartment,
          title: userMsg.slice(0, 72),
          description: userMsg,
          aiAnalysis: analysis,
        },
        readyToSubmit: userMsg.length > 8,
      });
    }

    try {
      const convo = (history || [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Citizen' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Language: ${lang === 'tl' ? 'Tagalog/Filipino' : 'English'}.
Recent conversation:
${convo}
Latest citizen message: "${userMsg}"

Extract best category from:
- Trash & Collection
- Double Parking & Driveway
- Road Closure & Events
- Drinking Water & Leaks
- Animal Welfare
- Pests, Trees & Vandalism
- Road Damage / Pothole
- Street Flooding
- Broken Streetlight

Reply concisely in 1-2 short sentences.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              category: { type: Type.STRING },
              reportClass: { type: Type.STRING },
              department: { type: Type.STRING },
              title: { type: Type.STRING },
              summaryDescription: { type: Type.STRING },
              readyToSubmit: { type: Type.BOOLEAN },
            },
            required: ['reply', 'category', 'reportClass', 'department', 'title', 'readyToSubmit'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        reply?: string;
        category?: ReportCategory;
        reportClass?: ReportClass;
        department?: LguDepartment;
        title?: string;
        summaryDescription?: string;
        readyToSubmit?: boolean;
      };

      res.json({
        reply: parsed.reply || `Prepared draft under ${analysis.suggestedCategory}.`,
        draftUpdate: {
          reportClass: parsed.reportClass === 'safety_hazard' ? 'safety_hazard' : 'non_hazard',
          category: parsed.category || analysis.suggestedCategory,
          assignedDepartment: parsed.department || analysis.suggestedDepartment,
          title: parsed.title || userMsg.slice(0, 72),
          description: parsed.summaryDescription || userMsg,
          aiAnalysis: analysis,
        },
        readyToSubmit: Boolean(parsed.readyToSubmit),
      });
    } catch {
      res.json({
        reply: `Prepared draft under ${analysis.suggestedCategory}. Confirm photo & map pin to submit.`,
        draftUpdate: {
          reportClass: analysis.suggestedClass,
          category: analysis.suggestedCategory,
          assignedDepartment: analysis.suggestedDepartment,
          title: userMsg.slice(0, 72),
          description: userMsg,
          aiAnalysis: analysis,
        },
        readyToSubmit: true,
      });
    }
  });

  app.post('/api/ai/support-chat', async (req, res) => {
    const { message, lang } = req.body as { message?: string; lang?: 'en' | 'tl' };
    const userMsg = (message || '').trim();
    if (!userMsg) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const idMatch = userMsg.match(/ESM-[A-Z0-9]+-\d+/i);
    if (idMatch) {
      const found = db.reports.find((r) => r.id.toUpperCase() === idMatch[0].toUpperCase());
      if (found) {
        return res.json({
          reply:
            lang === 'tl'
              ? `Ulat ${found.id} ("${found.title}") ay nasa estado na "${found.status}" sa ilalim ng ${found.assignedDepartment} (${found.addressLabel}).`
              : `Report ${found.id} ("${found.title}") is currently "${found.status.replace('_', ' ')}" under ${found.assignedDepartment} at ${found.addressLabel}.`,
          matchedReportId: found.id,
        });
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        reply:
          lang === 'tl'
            ? 'Pumili ng kategorya sa Home, maglakip ng larawan, at i-pin ang barangay sa San Mateo. Para sa agarang panganib, tumawag sa 911 o 8888.'
            : 'Select a category, attach a photo, and pin your San Mateo location to report. Check Live Status using your tracking ID (e.g., ESM-SM-0106), or call 911 / 8888 for emergencies.',
      });
    }

    try {
      const summaryContext = db.reports
        .slice(0, 5)
        .map((r) => `${r.id}: ${r.category} (${r.status}) in ${r.barangay}`)
        .join('; ');
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Citizen question: "${userMsg}"\nRecent San Mateo reports: ${summaryContext}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `You are the e-Sumbong Mo San Mateo Municipal Support Assistant. Answer concisely in ${
            lang === 'tl' ? 'Tagalog/Filipino' : 'English'
          } (2-3 crisp sentences).`,
        },
      });
      res.json({ reply: response.text || 'How can I assist with your San Mateo report?' });
    } catch {
      res.json({
        reply:
          'You can file a report in 3 steps on the Home page, track updates live by ID, or call 911 / 8888 for urgent emergencies.',
      });
    }
  });

  app.get('/api/reports', (_req, res) => {
    const sorted = [...db.reports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ reports: sorted });
  });

  app.post('/api/reports', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const {
        reportClass,
        category,
        title,
        description,
        mediaDataUrl,
        mediaName,
        lat,
        lng,
        addressLabel,
        barangay,
        assignedDepartment,
        aiAnalysis,
      } = req.body as {
        reportClass?: ReportClass;
        category?: ReportCategory;
        title?: string;
        description?: string;
        mediaDataUrl?: string;
        mediaName?: string;
        lat?: number;
        lng?: number;
        addressLabel?: string;
        barangay?: string;
        assignedDepartment?: LguDepartment;
        aiAnalysis?: AiAnalysis;
      };

      if (!mediaDataUrl) {
        return res
          .status(400)
          .json({ error: 'A photo or video evidence attachment is required to file a report.' });
      }
      if (!category) {
        return res.status(400).json({ error: 'Please select a report category.' });
      }

      const safeLat = Number(lat);
      const safeLng = Number(lng);
      if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) {
        return res.status(400).json({ error: 'Valid GPS coordinates are required.' });
      }

      const cleanDesc = (description || '').trim() || `${category} reported at ${addressLabel || 'pinned location'}.`;
      const savedMedia = saveMediaFile(mediaDataUrl, mediaName || 'evidence');
      const analysis =
        aiAnalysis ||
        (await analyzeWithGemini(cleanDesc, safeLat, safeLng, mediaDataUrl, reportClass));

      const nextNum = 100 + db.reports.length + 1;
      const reportId = `ESM-SM-0${nextNum}`;
      const nowIso = new Date().toISOString();

      const resolvedDept =
        assignedDepartment || analysis.suggestedDepartment || 'Municipal Engineering Office';
      const newReport: IncidentReport = {
        id: reportId,
        reporterId: req.user!.id,
        reporterName: req.user!.name,
        reporterEmail: req.user!.email,
        reportClass: reportClass === 'safety_hazard' ? 'safety_hazard' : 'non_hazard',
        category,
        title: title?.trim() || cleanDesc.slice(0, 74),
        description: cleanDesc,
        mediaUrl: savedMedia.url,
        mediaType: savedMedia.mediaType,
        mediaName: mediaName || 'evidence',
        lat: safeLat,
        lng: safeLng,
        addressLabel:
          addressLabel?.trim() || `San Mateo Pin (${safeLat.toFixed(5)}, ${safeLng.toFixed(5)})`,
        barangay: barangay?.trim() || req.user!.barangay || 'Guitnang Bayan I',
        status: 'triaged',
        assignedDepartment: resolvedDept,
        aiAnalysis: analysis,
        timeline: [
          {
            status: 'submitted',
            timestamp: nowIso,
            actor: req.user!.name,
            note: `Submitted ${savedMedia.mediaType} evidence with GPS pin.`,
          },
          {
            status: 'triaged',
            timestamp: nowIso,
            actor: analysis.source === 'gemini' ? 'Gemini AI Intake' : 'AI Intake Triage',
            note: analysis.duplicateOfId
              ? `Acknowledged (${category}) · Possible duplicate of ${analysis.duplicateOfId}.`
              : `Acknowledged (${category}) · Routed to ${resolvedDept}.`,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.reports.unshift(newReport);
      saveDb();
      broadcastEvent('report_created', newReport);
      res.status(201).json({ report: newReport });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to submit report.',
      });
    }
  });

  app.patch('/api/reports/:id/status', requireAuth, (req: AuthedRequest, res) => {
    if (req.user!.role !== 'lgu_officer') {
      return res
        .status(403)
        .json({ error: 'Only San Mateo LGU staff can update official resolution status.' });
    }
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const { status, assignedDepartment, note, resolutionMediaDataUrl, resolutionMediaName } =
      req.body as {
        status?: ReportStatus;
        assignedDepartment?: LguDepartment;
        note?: string;
        resolutionMediaDataUrl?: string;
        resolutionMediaName?: string;
      };

    const validStatuses: ReportStatus[] = [
      'submitted',
      'triaged',
      'assigned',
      'in_progress',
      'resolved',
    ];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid resolution status.' });
    }

    let photoUrl: string | undefined;
    if (resolutionMediaDataUrl) {
      try {
        const saved = saveMediaFile(resolutionMediaDataUrl, resolutionMediaName || 'resolution');
        photoUrl = saved.url;
        report.resolutionMediaUrl = saved.url;
      } catch (err) {
        return res.status(400).json({
          error: err instanceof Error ? err.message : 'Invalid resolution photo.',
        });
      }
    }

    const nowIso = new Date().toISOString();
    if (assignedDepartment) {
      report.assignedDepartment = assignedDepartment;
    }
    const nextStatus = status || report.status;
    report.status = nextStatus;
    report.updatedAt = nowIso;
    report.timeline.push({
      status: nextStatus,
      timestamp: nowIso,
      actor: `${req.user!.name} (${assignedDepartment || report.assignedDepartment})`,
      note:
        note?.trim() ||
        `Status updated to ${nextStatus.replace('_', ' ')} under ${assignedDepartment || report.assignedDepartment}.`,
      photoUrl,
    });

    saveDb();
    broadcastEvent('report_updated', report);
    res.json({ report });
  });

  app.post('/api/reports/:id/feedback', requireAuth, (req: AuthedRequest, res) => {
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    if (report.reporterId !== req.user!.id && req.user!.role !== 'lgu_officer') {
      return res.status(403).json({ error: 'Only the citizen who filed this report can rate it.' });
    }
    if (report.status !== 'resolved') {
      return res.status(400).json({ error: 'Feedback can be submitted once the report is resolved.' });
    }
    const { rating, comment } = req.body as { rating?: number; comment?: string };
    const safeRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const nowIso = new Date().toISOString();
    report.feedback = {
      rating: safeRating,
      comment: comment?.trim() || 'Confirmed resolved.',
      submittedAt: nowIso,
    };
    report.updatedAt = nowIso;
    saveDb();
    broadcastEvent('report_updated', report);
    res.json({ report });
  });

  app.get('/api/announcements', (_req, res) => {
    const sorted = [...db.announcements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ announcements: sorted });
  });

  app.post('/api/announcements', requireAuth, (req: AuthedRequest, res) => {
    if (req.user!.role !== 'lgu_officer') {
      return res.status(403).json({ error: 'Only LGU staff can publish municipal notices.' });
    }
    const { title, category, barangayScope, message } = req.body as {
      title?: string;
      category?: CityAnnouncement['category'];
      barangayScope?: string;
      message?: string;
    };
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Announcement title and message are required.' });
    }
    const ann: CityAnnouncement = {
      id: `ANN-SM-0${db.announcements.length + 1}`,
      title: title.trim(),
      category: category || 'Municipal Notice',
      barangayScope: barangayScope?.trim() || 'All Barangays',
      message: message.trim(),
      authorName: req.user!.name,
      createdAt: new Date().toISOString(),
    };
    db.announcements.unshift(ann);
    saveDb();
    broadcastEvent('announcement_created', ann);
    res.status(201).json({ announcement: ann });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`e-Sumbong Mo San Mateo server listening on http://localhost:${PORT}`);
  });
}

startServer();
