// Demo dataset for development and review. Never run in production (see index.ts).
// Deterministic: the same data (apart from "now"-relative dates) is produced on every run.
import { createHmac } from "node:crypto";
import { hash } from "argon2";
import {
  type Prisma,
  type PrismaClient,
  ActorType,
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintStatus,
  DisputeStatus,
  IdDocumentType,
  NotificationType,
  QuoteStatus,
  RequestEventType,
  RequestStatus,
  ReviewTag,
  TrustTier,
  UserRole,
  type VerificationLevel,
  VerificationStatus,
} from "../../src/generated/prisma/client";
import { makeRng, uuidv7 } from "./ids";

export const DEV_PASSWORD = "OgaSabi#Dev2026";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const rng = makeRng(20261011);

type City = "Port Harcourt" | "Lagos" | "Abuja";
const STATE: Record<City, string> = { "Port Harcourt": "Rivers", Lagos: "Lagos", Abuja: "FCT" };

const STREETS: Record<City, string[]> = {
  "Port Harcourt": [
    "Aba Road",
    "Rumuola Road",
    "Ada George Road",
    "Peter Odili Road",
    "Stadium Road",
    "Trans-Amadi Gardens",
  ],
  Lagos: [
    "Herbert Macaulay Way",
    "Adeniran Ogunsanya Street",
    "Allen Avenue",
    "Admiralty Way",
    "Lekki-Epe Expressway",
    "Ikorodu Road",
  ],
  Abuja: [
    "Aminu Kano Crescent",
    "Ahmadu Bello Way",
    "Gana Street",
    "Gwarinpa 1st Avenue",
    "Kubwa Expressway",
    "Adetokunbo Ademola Crescent",
  ],
};

type ArtisanSeed = {
  key: string;
  first: string;
  last: string;
  business: string;
  city: City;
  area: string;
  lat: number;
  lng: number;
  cats: string[];
  years: number;
  minNaira: number;
  maxNaira: number;
  level: VerificationLevel;
  profile: "ACTIVE" | "DRAFT";
  jobs: number; // completed jobs to generate
  quality: number; // 0..1, drives ratings
  respMin: number; // typical first-response time in minutes
  artisanCancels: number; // artisan-initiated cancellations to generate
  customerCancels: number;
  declines: number;
  expired: number;
  bio: string;
  availableNow: boolean;
  alsoCustomer?: boolean;
  pendingVerification?: boolean;
};

const ARTISANS: ArtisanSeed[] = [
  {
    key: "briggs",
    first: "Ibifuro",
    last: "Briggs",
    business: "Briggs Electrical Works",
    city: "Port Harcourt",
    area: "Rumuola",
    lat: 4.8277,
    lng: 7.0231,
    cats: ["electrician"],
    years: 11,
    minNaira: 5000,
    maxNaira: 15000,
    level: "ADMIN_REVIEWED",
    profile: "ACTIVE",
    jobs: 46,
    quality: 0.86,
    respMin: 9,
    artisanCancels: 1,
    customerCancels: 3,
    declines: 3,
    expired: 1,
    bio: "Domestic and small-commercial wiring, fault finding, DB board upgrades. I explain the fault before I touch anything.",
    availableNow: true,
  },
  {
    key: "jaja",
    first: "Tonye",
    last: "Jaja",
    business: "Jaja Cool Air Services",
    city: "Port Harcourt",
    area: "GRA Phase 2",
    lat: 4.8051,
    lng: 7.0127,
    cats: ["ac-technician"],
    years: 8,
    minNaira: 8000,
    maxNaira: 25000,
    level: "ID_SELFIE_VERIFIED",
    profile: "ACTIVE",
    jobs: 28,
    quality: 0.8,
    respMin: 18,
    artisanCancels: 1,
    customerCancels: 2,
    declines: 2,
    expired: 1,
    bio: "Split-unit and cassette AC installation, gas refill and deep servicing. Genuine parts only.",
    availableNow: false,
  },
  {
    key: "wogu",
    first: "Emeka",
    last: "Wogu",
    business: "Wogu Plumbing & Drainage",
    city: "Port Harcourt",
    area: "Trans-Amadi",
    lat: 4.8112,
    lng: 7.0457,
    cats: ["plumber"],
    years: 14,
    minNaira: 6000,
    maxNaira: 20000,
    level: "ADMIN_REVIEWED",
    profile: "ACTIVE",
    jobs: 38,
    quality: 0.83,
    respMin: 14,
    artisanCancels: 0,
    customerCancels: 3,
    declines: 2,
    expired: 2,
    bio: "Leaks, burst pipes, overhead tank and borehole pump fitting, blocked drains.",
    availableNow: true,
  },
  {
    key: "ikpe",
    first: "Sunday",
    last: "Ikpe",
    business: "Ikpe Generator Clinic",
    city: "Port Harcourt",
    area: "Rumuokoro",
    lat: 4.8631,
    lng: 7.0412,
    cats: ["generator-technician", "solar-inverter"],
    years: 9,
    minNaira: 7000,
    maxNaira: 30000,
    level: "ID_VERIFIED",
    profile: "ACTIVE",
    jobs: 17,
    quality: 0.72,
    respMin: 35,
    artisanCancels: 2,
    customerCancels: 1,
    declines: 3,
    expired: 2,
    bio: "Petrol and diesel generator servicing up to 60kVA. Inverter and battery installs.",
    availableNow: false,
  },
  {
    key: "dagogo",
    first: "Nengi",
    last: "Dagogo-Hart",
    business: "Nengi's Paint & Finish",
    city: "Port Harcourt",
    area: "D-Line",
    lat: 4.7894,
    lng: 7.0158,
    cats: ["painter", "pop-ceiling"],
    years: 6,
    minNaira: 10000,
    maxNaira: 40000,
    level: "ID_SELFIE_VERIFIED",
    profile: "ACTIVE",
    jobs: 9,
    quality: 0.9,
    respMin: 22,
    artisanCancels: 0,
    customerCancels: 1,
    declines: 1,
    expired: 0,
    bio: "Interior and exterior painting, POP ceilings, clean finishing. We cover your furniture and clean up.",
    availableNow: true,
  },
  {
    key: "edafe",
    first: "Ovie",
    last: "Edafe",
    business: "Ovie Auto Care",
    city: "Port Harcourt",
    area: "Old GRA",
    lat: 4.7977,
    lng: 7.0089,
    cats: ["auto-mechanic"],
    years: 12,
    minNaira: 5000,
    maxNaira: 25000,
    level: "ID_VERIFIED",
    profile: "ACTIVE",
    jobs: 21,
    quality: 0.74,
    respMin: 40,
    artisanCancels: 2,
    customerCancels: 2,
    declines: 2,
    expired: 1,
    bio: "Mobile mechanic. Engine diagnosis, brakes, suspension and servicing at your location.",
    availableNow: false,
    alsoCustomer: true,
  },
  {
    key: "amadi",
    first: "Prince",
    last: "Amadi",
    business: "Amadi Carpentry",
    city: "Port Harcourt",
    area: "Eliozu",
    lat: 4.8738,
    lng: 7.0705,
    cats: ["carpenter"],
    years: 5,
    minNaira: 8000,
    maxNaira: 35000,
    level: "NONE",
    profile: "DRAFT",
    jobs: 0,
    quality: 0.7,
    respMin: 60,
    artisanCancels: 0,
    customerCancels: 0,
    declines: 0,
    expired: 0,
    bio: "Doors, wardrobes and roofing timber.",
    availableNow: false,
  },

  {
    key: "adeyemi",
    first: "Babatunde",
    last: "Adeyemi",
    business: "BA Power Solutions",
    city: "Lagos",
    area: "Yaba",
    lat: 6.5095,
    lng: 3.3711,
    cats: ["electrician", "solar-inverter"],
    years: 10,
    minNaira: 6000,
    maxNaira: 20000,
    level: "ADMIN_REVIEWED",
    profile: "ACTIVE",
    jobs: 120,
    quality: 0.88,
    respMin: 7,
    artisanCancels: 2,
    customerCancels: 8,
    declines: 6,
    expired: 2,
    bio: "Wiring, load calculation, inverter and solar installs for flats and offices across the mainland.",
    availableNow: true,
  },
  {
    key: "balogun",
    first: "Kolawole",
    last: "Balogun",
    business: "Kola Plumbing Lagos",
    city: "Lagos",
    area: "Surulere",
    lat: 6.4969,
    lng: 3.355,
    cats: ["plumber"],
    years: 7,
    minNaira: 5000,
    maxNaira: 18000,
    level: "ID_SELFIE_VERIFIED",
    profile: "ACTIVE",
    jobs: 41,
    quality: 0.78,
    respMin: 16,
    artisanCancels: 1,
    customerCancels: 4,
    declines: 3,
    expired: 1,
    bio: "Leak detection, water heaters, bathroom fittings and pressure pumps.",
    availableNow: true,
  },
  {
    key: "ogunleye",
    first: "Segun",
    last: "Ogunleye",
    business: "Ogunleye Cooling Systems",
    city: "Lagos",
    area: "Ikeja",
    lat: 6.6018,
    lng: 3.3515,
    cats: ["ac-technician", "appliance-repair"],
    years: 13,
    minNaira: 8000,
    maxNaira: 30000,
    level: "ADMIN_REVIEWED",
    profile: "ACTIVE",
    jobs: 64,
    quality: 0.8,
    respMin: 20,
    artisanCancels: 2,
    customerCancels: 5,
    declines: 4,
    expired: 2,
    bio: "AC, freezer and cold-room repair. Same-week installs for new apartments.",
    availableNow: false,
  },
  {
    key: "eze",
    first: "Chidi",
    last: "Eze",
    business: "Eze Gen Doctor",
    city: "Lagos",
    area: "Ajah",
    lat: 6.4698,
    lng: 3.5852,
    cats: ["generator-technician"],
    years: 8,
    minNaira: 8000,
    maxNaira: 28000,
    level: "ID_VERIFIED",
    profile: "ACTIVE",
    jobs: 33,
    quality: 0.62,
    respMin: 55,
    artisanCancels: 7,
    customerCancels: 2,
    declines: 5,
    expired: 4,
    bio: "Generator servicing and repair, Lekki to Ajah corridor.",
    availableNow: false,
  },
  {
    key: "adewale",
    first: "Folake",
    last: "Adewale",
    business: "Folake Tiles & Finishes",
    city: "Lagos",
    area: "Lekki Phase 1",
    lat: 6.4478,
    lng: 3.4723,
    cats: ["tiler", "painter"],
    years: 9,
    minNaira: 15000,
    maxNaira: 60000,
    level: "ID_SELFIE_VERIFIED",
    profile: "ACTIVE",
    jobs: 19,
    quality: 0.87,
    respMin: 30,
    artisanCancels: 0,
    customerCancels: 2,
    declines: 2,
    expired: 1,
    bio: "Porcelain and marble tiling, screeding, painting. Neat edges, no excuses.",
    availableNow: true,
  },
  {
    key: "lawal",
    first: "Rasheed",
    last: "Lawal",
    business: "Lawal Auto Garage",
    city: "Lagos",
    area: "Maryland",
    lat: 6.5667,
    lng: 3.3639,
    cats: ["auto-mechanic"],
    years: 15,
    minNaira: 5000,
    maxNaira: 30000,
    level: "ID_VERIFIED",
    profile: "ACTIVE",
    jobs: 26,
    quality: 0.76,
    respMin: 28,
    artisanCancels: 1,
    customerCancels: 2,
    declines: 2,
    expired: 1,
    bio: "Japanese and German car specialists. Diagnosis with a scan tool, honest quotes.",
    availableNow: false,
  },

  {
    key: "sani",
    first: "Abubakar",
    last: "Sani",
    business: "Sani Electric",
    city: "Abuja",
    area: "Wuse 2",
    lat: 9.0765,
    lng: 7.4739,
    cats: ["electrician", "cctv-installer"],
    years: 9,
    minNaira: 6000,
    maxNaira: 18000,
    level: "ID_SELFIE_VERIFIED",
    profile: "ACTIVE",
    jobs: 30,
    quality: 0.82,
    respMin: 15,
    artisanCancels: 1,
    customerCancels: 2,
    declines: 2,
    expired: 1,
    bio: "Electrical repairs, CCTV and electric-fence installation for homes and shops.",
    availableNow: true,
  },
  {
    key: "danjuma",
    first: "Yusuf",
    last: "Danjuma",
    business: "Danjuma AC & Refrigeration",
    city: "Abuja",
    area: "Garki",
    lat: 9.0333,
    lng: 7.4892,
    cats: ["ac-technician"],
    years: 11,
    minNaira: 8000,
    maxNaira: 25000,
    level: "ADMIN_REVIEWED",
    profile: "ACTIVE",
    jobs: 35,
    quality: 0.84,
    respMin: 12,
    artisanCancels: 0,
    customerCancels: 3,
    declines: 2,
    expired: 1,
    bio: "AC installation, servicing and gas refill. Harmattan-season service plans.",
    availableNow: false,
  },
  {
    key: "ibrahim",
    first: "Musa",
    last: "Ibrahim",
    business: "Musa Welding & Fabrication",
    city: "Abuja",
    area: "Gwarinpa",
    lat: 9.1104,
    lng: 7.4034,
    cats: ["welder"],
    years: 12,
    minNaira: 10000,
    maxNaira: 50000,
    level: "ID_VERIFIED",
    profile: "ACTIVE",
    jobs: 14,
    quality: 0.79,
    respMin: 45,
    artisanCancels: 1,
    customerCancels: 1,
    declines: 2,
    expired: 1,
    bio: "Gates, burglar-proof, window guards and steel staircases.",
    availableNow: false,
  },
  {
    key: "okeke",
    first: "Ngozi",
    last: "Okeke",
    business: "Ngozi Clean & Shine",
    city: "Abuja",
    area: "Maitama",
    lat: 9.0836,
    lng: 7.4934,
    cats: ["cleaner"],
    years: 4,
    minNaira: 7000,
    maxNaira: 20000,
    level: "ID_SELFIE_VERIFIED",
    profile: "ACTIVE",
    jobs: 22,
    quality: 0.89,
    respMin: 20,
    artisanCancels: 0,
    customerCancels: 2,
    declines: 1,
    expired: 0,
    bio: "Home, office and post-construction cleaning with our own equipment.",
    availableNow: true,
  },
  {
    key: "bello",
    first: "Garba",
    last: "Bello",
    business: "Bello Plumbing Abuja",
    city: "Abuja",
    area: "Kubwa",
    lat: 9.1521,
    lng: 7.3306,
    cats: ["plumber"],
    years: 6,
    minNaira: 5000,
    maxNaira: 15000,
    level: "NONE",
    profile: "ACTIVE",
    jobs: 0,
    quality: 0.7,
    respMin: 60,
    artisanCancels: 0,
    customerCancels: 0,
    declines: 0,
    expired: 0,
    bio: "Plumbing repairs and borehole installs.",
    availableNow: false,
    pendingVerification: true,
  },
];

type CustomerSeed = {
  key: string;
  first: string;
  last: string;
  city: City;
  area: string;
  lat: number;
  lng: number;
};
const CUSTOMERS: CustomerSeed[] = [
  {
    key: "adaeze",
    first: "Adaeze",
    last: "Nwankwo",
    city: "Port Harcourt",
    area: "Rumuola",
    lat: 4.8302,
    lng: 7.0249,
  },
  {
    key: "ifeanyi",
    first: "Ifeanyi",
    last: "Okoro",
    city: "Port Harcourt",
    area: "Rumuokoro",
    lat: 4.8588,
    lng: 7.0391,
  },
  {
    key: "blessing",
    first: "Blessing",
    last: "Etim",
    city: "Port Harcourt",
    area: "GRA Phase 2",
    lat: 4.8063,
    lng: 7.0141,
  },
  {
    key: "chiamaka",
    first: "Chiamaka",
    last: "Obi",
    city: "Lagos",
    area: "Yaba",
    lat: 6.5119,
    lng: 3.3744,
  },
  {
    key: "tunde",
    first: "Tunde",
    last: "Bakare",
    city: "Lagos",
    area: "Ikeja",
    lat: 6.6044,
    lng: 3.3496,
  },
  {
    key: "yetunde",
    first: "Yetunde",
    last: "Salami",
    city: "Lagos",
    area: "Lekki Phase 1",
    lat: 6.4491,
    lng: 3.4701,
  },
  {
    key: "hauwa",
    first: "Hauwa",
    last: "Garba",
    city: "Abuja",
    area: "Wuse 2",
    lat: 9.0788,
    lng: 7.4702,
  },
  {
    key: "emmanuel",
    first: "Emmanuel",
    last: "Audu",
    city: "Abuja",
    area: "Garki",
    lat: 9.0301,
    lng: 7.4866,
  },
];

const PROBLEMS: Record<string, string[]> = {
  electrician: [
    "Sockets in the sitting room trip the breaker whenever the AC is on.",
    "Need a new DB board and rewiring for a two-bedroom flat.",
    "Half of the house has no light since last night. The main breaker is fine.",
  ],
  plumber: [
    "Kitchen sink is leaking from under the cabinet and the tank pressure is very low.",
    "Toilet cistern keeps running and the water bill is rising.",
    "Borehole pump is not lifting water to the overhead tank.",
  ],
  "ac-technician": [
    "Split unit is blowing warm air. 1.5HP, installed two years ago.",
    "Need two new 1HP units installed in the bedrooms.",
    "AC is leaking water inside and makes a rattling noise.",
  ],
  "generator-technician": [
    "7.5kVA generator will not start after servicing. Battery is fine.",
    "Generator surges and dies after a few minutes.",
    "Need a routine service and oil change for a 5kVA petrol generator.",
  ],
  "solar-inverter": [
    "Inverter shows overload when I switch on the freezer.",
    "Want a 3kVA inverter with two batteries installed.",
  ],
  "auto-mechanic": [
    "Toyota Camry 2008, check-engine light on and shaking at idle.",
    "Brakes squeal and the pedal feels soft.",
    "Car overheats in traffic. Need diagnosis.",
  ],
  carpenter: ["Wardrobe door hinges are broken and the track is damaged."],
  painter: [
    "Repaint a three-bedroom flat, emulsion for walls and gloss for doors.",
    "Exterior fence wall painting, about 40 metres.",
  ],
  tiler: [
    "Retile a bathroom floor and walls, 12 sqm.",
    "Fix cracked kitchen floor tiles and re-grout.",
  ],
  welder: ["Need a sliding gate and two window burglar-proofs."],
  cleaner: [
    "Deep clean of a four-bedroom duplex before we move in.",
    "Post-construction cleaning for a shop.",
  ],
  "cctv-installer": ["Install four cameras and a DVR for a small shop."],
  "appliance-repair": ["Chest freezer not cooling but the compressor runs."],
  "pop-ceiling": ["POP ceiling for the sitting room with cove lighting."],
};

const POSITIVE = [
  "Came on time and explained the fault before starting. Fair price.",
  "Very professional. Cleaned up after the job and the work is neat.",
  "Fixed it the same day. Will definitely call again.",
  "Honest about what was wrong, did not try to sell me parts I did not need.",
  "Good communication all through. Arrived when he said he would.",
  "Neat work and reasonable price. Highly recommended.",
];
const NEUTRAL = [
  "Job done well but arrived a bit later than agreed.",
  "Fixed the problem. Price was higher than the first estimate.",
];
const NEGATIVE = [
  "Came late and the issue came back after two days.",
  "Left the place messy and the price changed after the job started.",
];
const REPLIES = [
  "Thank you for the opportunity, we appreciate you.",
  "Glad we could help. Call us anytime.",
  "Thanks for the feedback, noted.",
];
const CANCEL_CUSTOMER = [
  "Found someone closer",
  "I no longer need the service",
  "Plans changed, will rebook later",
];
const CANCEL_ARTISAN = [
  "Parts not available this week",
  "Emergency on another job",
  "Customer location too far",
];

const POS_TAGS = [
  ReviewTag.PUNCTUAL,
  ReviewTag.CLEAN_WORK,
  ReviewTag.FAIR_PRICE,
  ReviewTag.GOOD_COMMUNICATION,
  ReviewTag.KNOWLEDGEABLE,
  ReviewTag.POLITE,
  ReviewTag.FAST,
  ReviewTag.WOULD_HIRE_AGAIN,
];
const NEG_TAGS = [
  ReviewTag.LATE,
  ReviewTag.OVERPRICED,
  ReviewTag.MESSY,
  ReviewTag.POOR_COMMUNICATION,
];

type Tables = {
  users: Prisma.UserCreateManyInput[];
  profiles: Prisma.ArtisanProfileCreateManyInput[];
  artisanCategories: Prisma.ArtisanCategoryCreateManyInput[];
  availability: Prisma.AvailabilitySlotCreateManyInput[];
  verifications: Prisma.IdentityVerificationCreateManyInput[];
  requests: Prisma.ServiceRequestCreateManyInput[];
  events: Prisma.RequestEventCreateManyInput[];
  quotes: Prisma.QuoteCreateManyInput[];
  reviews: Prisma.ReviewCreateManyInput[];
  messages: Prisma.MessageCreateManyInput[];
  complaints: Prisma.ComplaintCreateManyInput[];
  disputes: Prisma.DisputeCreateManyInput[];
  reports: Prisma.ReportCreateManyInput[];
  favorites: Prisma.FavoriteCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[];
};

export async function seedDemo(db: PrismaClient): Promise<void> {
  const now = Date.now();
  const passwordHash = await hash(DEV_PASSWORD);
  const hmac = (v: string) => createHmac("sha256", "ogasabi-seed-only").update(v).digest("hex");

  const cats = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const catId = (slug: string): string => {
    const id = cats.get(slug);
    if (!id) throw new Error(`Category "${slug}" missing. Run the reference seed first.`);
    return id;
  };

  const t: Tables = {
    users: [],
    profiles: [],
    artisanCategories: [],
    availability: [],
    verifications: [],
    requests: [],
    events: [],
    quotes: [],
    reviews: [],
    messages: [],
    complaints: [],
    disputes: [],
    reports: [],
    favorites: [],
    notifications: [],
  };

  let phoneCounter = 0;
  const nextPhone = () => `+2347000000${String(1000 + ++phoneCounter).slice(1)}`; // fictional range, e.g. +2347000000001

  // ── Users ──────────────────────────────────────────────────────────
  const adminId = uuidv7(now - 400 * DAY);
  t.users.push({
    id: adminId,
    email: "admin@ogasabi.test",
    phone: nextPhone(),
    emailVerifiedAt: new Date(now - 400 * DAY),
    phoneVerifiedAt: new Date(now - 400 * DAY),
    passwordHash,
    firstName: "Amaka",
    lastName: "Admin",
    roles: [UserRole.ADMIN],
    termsAcceptedAt: new Date(now - 400 * DAY),
    privacyAcceptedAt: new Date(now - 400 * DAY),
    createdAt: new Date(now - 400 * DAY),
  });

  const customerIds = new Map<string, string>();
  const customerByCity = new Map<City, CustomerSeed[]>();
  for (const c of CUSTOMERS) {
    const created = now - rng.int(60, 380) * DAY;
    const id = uuidv7(created);
    customerIds.set(c.key, id);
    customerByCity.set(c.city, [...(customerByCity.get(c.city) ?? []), c]);
    t.users.push({
      id,
      email: `${c.first}.${c.last}@ogasabi.test`.toLowerCase(),
      phone: nextPhone(),
      phoneVerifiedAt: new Date(created),
      passwordHash,
      firstName: c.first,
      lastName: c.last,
      roles: [UserRole.CUSTOMER],
      termsAcceptedAt: new Date(created),
      privacyAcceptedAt: new Date(created),
      createdAt: new Date(created),
    });
  }

  const artisanUserIds = new Map<string, string>();
  const profileIds = new Map<string, string>();
  for (const a of ARTISANS) {
    const created = now - rng.int(120, 420) * DAY;
    const userId = uuidv7(created);
    artisanUserIds.set(a.key, userId);
    const phone = nextPhone();
    t.users.push({
      id: userId,
      email: `${a.first}.${a.last}@ogasabi.test`.toLowerCase().replace(/[^a-z0-9.@-]/g, ""),
      phone,
      phoneVerifiedAt: new Date(created),
      passwordHash,
      firstName: a.first,
      lastName: a.last,
      roles: a.alsoCustomer ? [UserRole.CUSTOMER, UserRole.ARTISAN] : [UserRole.ARTISAN],
      termsAcceptedAt: new Date(created),
      privacyAcceptedAt: new Date(created),
      createdAt: new Date(created),
    });
    profileIds.set(a.key, uuidv7(created + HOUR));
  }

  // ── Request builder ────────────────────────────────────────────────
  type Spec = {
    status: RequestStatus;
    customerUserId: string;
    customer: { city: City; area: string; lat: number; lng: number };
    artisan: ArtisanSeed;
    category: string;
    createdAt: number;
    respSec?: number;
    viaQuote?: boolean;
    cancelBy?: "CUSTOMER" | "ARTISAN";
    immediate?: boolean;
    review?: boolean;
    quality?: number;
  };
  type Built = { id: string; spec: Spec; confirmedAt?: number; finalKobo?: number };
  const built: Built[] = [];

  const naira = (n: number) => Math.round(n / 500) * 500 * 100; // kobo, rounded to ₦500

  function addEvent(
    requestId: string,
    type: RequestEventType,
    at: number,
    role: ActorType,
    actorId: string | null,
    from: RequestStatus | null,
    to: RequestStatus | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    t.events.push({
      id: uuidv7(at),
      requestId,
      type,
      fromStatus: from,
      toStatus: to,
      actorId,
      actorRole: role,
      metadata: metadata ?? undefined,
      createdAt: new Date(at),
    });
  }

  function buildRequest(spec: Spec): Built {
    const { artisan, customer, createdAt } = spec;
    const artisanUserId = artisanUserIds.get(artisan.key) as string;
    const id = uuidv7(createdAt);
    const status = spec.status;
    const resp = Math.round(
      (spec.respSec ?? artisan.respMin * 60 * (0.4 + rng.next() * 1.6)) * 1000,
    );
    const respondedAt = createdAt + resp;
    const jitter = () => (rng.next() - 0.5) * 0.012;
    const street = `${rng.int(2, 78)} ${rng.pick(STREETS[customer.city])}`;
    const immediate = spec.immediate ?? rng.chance(0.4);
    const scheduledFor = immediate
      ? null
      : new Date(createdAt + rng.int(1, 3) * DAY + rng.int(8, 16) * HOUR);
    const base = rng.int(artisan.minNaira, artisan.maxNaira * 2);
    const quotedKobo = spec.viaQuote ? naira(base) : null;
    const finalKobo = naira(base * (rng.chance(0.15) ? 1.2 : 1));

    let acceptedAt: number | null = null,
      startedAt: number | null = null,
      markedAt: number | null = null,
      completedAt: number | null = null,
      cancelledAt: number | null = null;
    let firstResponseAt: number | null = null;
    let cancelReason: string | null = null,
      declineReason: string | null = null;

    addEvent(
      id,
      RequestEventType.CREATED,
      createdAt,
      ActorType.CUSTOMER,
      spec.customerUserId,
      null,
      RequestStatus.PENDING,
    );

    // A cancellation either happens after the artisan accepted (always, when the artisan cancels) or
    // while the request was still waiting for a response (customer changed their mind).
    const cancelAfterAccept =
      status === "CANCELLED" && (spec.cancelBy === "ARTISAN" || rng.chance(0.5));
    const accepted =
      (
        [
          "ACCEPTED",
          "EN_ROUTE",
          "IN_PROGRESS",
          "AWAITING_CONFIRMATION",
          "COMPLETED",
          "DISPUTED",
        ] as RequestStatus[]
      ).includes(status) || cancelAfterAccept;
    if (status === "DECLINED") {
      firstResponseAt = respondedAt;
      declineReason = "Fully booked this week";
      addEvent(
        id,
        RequestEventType.DECLINED,
        respondedAt,
        ActorType.ARTISAN,
        artisanUserId,
        RequestStatus.PENDING,
        RequestStatus.DECLINED,
        { reason: declineReason },
      );
    } else if (status === "EXPIRED") {
      addEvent(
        id,
        RequestEventType.EXPIRED,
        createdAt + 24 * HOUR,
        ActorType.SYSTEM,
        null,
        RequestStatus.PENDING,
        RequestStatus.EXPIRED,
      );
    } else if (status === "QUOTED") {
      firstResponseAt = respondedAt;
      addEvent(
        id,
        RequestEventType.QUOTED,
        respondedAt,
        ActorType.ARTISAN,
        artisanUserId,
        RequestStatus.PENDING,
        RequestStatus.QUOTED,
        { amountKobo: quotedKobo },
      );
    } else if (accepted) {
      firstResponseAt = respondedAt;
      if (spec.viaQuote) {
        addEvent(
          id,
          RequestEventType.QUOTED,
          respondedAt,
          ActorType.ARTISAN,
          artisanUserId,
          RequestStatus.PENDING,
          RequestStatus.QUOTED,
          { amountKobo: quotedKobo },
        );
        acceptedAt = respondedAt + rng.int(5, 90) * MIN;
        addEvent(
          id,
          RequestEventType.QUOTE_ACCEPTED,
          acceptedAt,
          ActorType.CUSTOMER,
          spec.customerUserId,
          RequestStatus.QUOTED,
          RequestStatus.ACCEPTED,
        );
      } else {
        acceptedAt = respondedAt;
        addEvent(
          id,
          RequestEventType.ACCEPTED,
          acceptedAt,
          ActorType.ARTISAN,
          artisanUserId,
          RequestStatus.PENDING,
          RequestStatus.ACCEPTED,
        );
      }
      let cursor = acceptedAt;
      const steps: [RequestStatus, RequestEventType, ActorType, string | null][] = [
        [RequestStatus.EN_ROUTE, RequestEventType.EN_ROUTE, ActorType.ARTISAN, artisanUserId],
        [RequestStatus.IN_PROGRESS, RequestEventType.STARTED, ActorType.ARTISAN, artisanUserId],
        [
          RequestStatus.AWAITING_CONFIRMATION,
          RequestEventType.MARKED_COMPLETE,
          ActorType.ARTISAN,
          artisanUserId,
        ],
        [
          RequestStatus.COMPLETED,
          RequestEventType.CONFIRMED_COMPLETE,
          ActorType.CUSTOMER,
          spec.customerUserId,
        ],
      ];
      let prev: RequestStatus = RequestStatus.ACCEPTED;
      const target =
        status === "DISPUTED"
          ? RequestStatus.AWAITING_CONFIRMATION
          : status === "CANCELLED"
            ? RequestStatus.ACCEPTED
            : status;
      for (const [to, type, role, actor] of steps) {
        if (prev === target) break;
        cursor += rng.int(20, 180) * MIN;
        addEvent(id, type, cursor, role, actor, prev, to);
        if (to === RequestStatus.EN_ROUTE) cursor += 0;
        if (to === RequestStatus.IN_PROGRESS) startedAt = cursor;
        if (to === RequestStatus.AWAITING_CONFIRMATION) markedAt = cursor;
        if (to === RequestStatus.COMPLETED) completedAt = cursor;
        prev = to;
      }
      if (status === "DISPUTED") {
        addEvent(
          id,
          RequestEventType.DISPUTE_OPENED,
          cursor + 30 * MIN,
          ActorType.CUSTOMER,
          spec.customerUserId,
          RequestStatus.AWAITING_CONFIRMATION,
          RequestStatus.DISPUTED,
        );
      }
      if (status === "CANCELLED") {
        cancelledAt = cursor + rng.int(30, 600) * MIN;
        const role = spec.cancelBy === "ARTISAN" ? ActorType.ARTISAN : ActorType.CUSTOMER;
        cancelReason = rng.pick(spec.cancelBy === "ARTISAN" ? CANCEL_ARTISAN : CANCEL_CUSTOMER);
        addEvent(
          id,
          RequestEventType.CANCELLED,
          cancelledAt,
          role,
          role === ActorType.ARTISAN ? artisanUserId : spec.customerUserId,
          RequestStatus.ACCEPTED,
          RequestStatus.CANCELLED,
          { reason: cancelReason },
        );
      }
    } else if (status === "CANCELLED") {
      // cancelled before the artisan responded (customer changed their mind)
      cancelledAt = createdAt + rng.int(3, 40) * MIN;
      cancelReason = rng.pick(CANCEL_CUSTOMER);
      addEvent(
        id,
        RequestEventType.CANCELLED,
        cancelledAt,
        ActorType.CUSTOMER,
        spec.customerUserId,
        RequestStatus.PENDING,
        RequestStatus.CANCELLED,
        { reason: cancelReason },
      );
    }

    const cancelRole: ActorType | null =
      status === "CANCELLED"
        ? spec.cancelBy === "ARTISAN"
          ? ActorType.ARTISAN
          : ActorType.CUSTOMER
        : null;
    const cancelActorId =
      status === "CANCELLED"
        ? spec.cancelBy === "ARTISAN"
          ? artisanUserId
          : spec.customerUserId
        : null;
    const hasPrice = completedAt !== null || markedAt !== null || status === "DISPUTED";

    t.requests.push({
      id,
      customerId: spec.customerUserId,
      artisanId: profileIds.get(artisan.key) as string,
      categoryId: catId(spec.category),
      status,
      description: rng.pick(
        PROBLEMS[spec.category] ??
          PROBLEMS[artisan.cats[0] as string] ?? ["General repair needed."],
      ),
      addressLine: `${street}, ${customer.area}`,
      landmark: rng.chance(0.4) ? "Opposite the filling station" : null,
      areaLabel: `${customer.area}, ${customer.city}`,
      city: customer.city,
      state: STATE[customer.city],
      lat: customer.lat + jitter(),
      lng: customer.lng + jitter(),
      isImmediate: immediate,
      scheduledFor,
      quotedAmountKobo: quotedKobo,
      finalAmountKobo: hasPrice ? (quotedKobo ?? finalKobo) : null,
      expiresAt:
        status === "PENDING" || status === "QUOTED" ? new Date(createdAt + 24 * HOUR) : null,
      firstResponseAt: firstResponseAt ? new Date(firstResponseAt) : null,
      acceptedAt: acceptedAt ? new Date(acceptedAt) : null,
      startedAt: startedAt ? new Date(startedAt) : null,
      markedCompleteAt: markedAt ? new Date(markedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
      cancelledAt: cancelledAt ? new Date(cancelledAt) : null,
      cancelledById: cancelActorId,
      cancelledByRole: cancelRole,
      cancellationReason: cancelReason,
      declineReason,
      createdAt: new Date(createdAt),
      updatedAt: new Date(completedAt ?? cancelledAt ?? markedAt ?? acceptedAt ?? respondedAt),
    });

    if (quotedKobo !== null) {
      const qStatus = status === "QUOTED" ? QuoteStatus.PENDING : QuoteStatus.ACCEPTED;
      t.quotes.push({
        id: uuidv7(respondedAt),
        requestId: id,
        artisanId: profileIds.get(artisan.key) as string,
        amountKobo: quotedKobo,
        note: "Includes labour. Materials extra if needed.",
        status: qStatus,
        respondedAt: qStatus === QuoteStatus.ACCEPTED && acceptedAt ? new Date(acceptedAt) : null,
        createdAt: new Date(respondedAt),
      });
    }

    let confirmedAt: number | undefined;
    if (completedAt !== null) {
      confirmedAt = completedAt;
      if (spec.review ?? rng.chance(0.85)) {
        const q = spec.quality ?? artisan.quality;
        const roll = rng.next();
        const rating =
          roll < q * 0.72 ? 5 : roll < q * 0.72 + 0.22 ? 4 : roll < 0.93 ? 3 : roll < 0.97 ? 2 : 1;
        const tags: ReviewTag[] = [];
        const pool =
          rating >= 4
            ? POS_TAGS
            : rating <= 2
              ? NEG_TAGS
              : [...POS_TAGS.slice(0, 2), ...NEG_TAGS.slice(0, 1)];
        for (let i = rng.int(1, 3); i > 0; i--) {
          const tg = rng.pick(pool);
          if (!tags.includes(tg)) tags.push(tg);
        }
        const reviewedAt = completedAt + rng.int(1, 48) * HOUR;
        const replied = rng.chance(0.4);
        t.reviews.push({
          id: uuidv7(reviewedAt),
          requestId: id,
          authorId: spec.customerUserId,
          artisanId: profileIds.get(artisan.key) as string,
          rating,
          tags,
          comment: rng.chance(0.8)
            ? rng.pick(rating >= 4 ? POSITIVE : rating === 3 ? NEUTRAL : NEGATIVE)
            : null,
          replyBody: replied ? rng.pick(REPLIES) : null,
          repliedAt: replied ? new Date(reviewedAt + rng.int(1, 24) * HOUR) : null,
          createdAt: new Date(reviewedAt),
          updatedAt: new Date(reviewedAt),
        });
        addEvent(
          id,
          RequestEventType.REVIEW_POSTED,
          reviewedAt,
          ActorType.CUSTOMER,
          spec.customerUserId,
          null,
          null,
        );
      }
    }
    const b: Built = { id, spec, ...(confirmedAt !== undefined ? { confirmedAt } : {}), finalKobo };
    built.push(b);
    return b;
  }

  // ── Historical requests ────────────────────────────────────────────
  const customerPool = (city: City) => customerByCity.get(city) ?? [];
  const asCustomer = (c: CustomerSeed) => ({
    id: customerIds.get(c.key) as string,
    loc: { city: c.city, area: c.area, lat: c.lat, lng: c.lng },
  });

  for (const a of ARTISANS) {
    const pool = customerPool(a.city);
    if (a.jobs === 0 && a.artisanCancels === 0) continue;
    // A few "regulars" so repeat-customer detection has real signal.
    const regulars = [rng.pick(pool), rng.pick(pool)];
    const total = a.jobs + a.artisanCancels + a.customerCancels + a.declines + a.expired;
    const plan: { status: RequestStatus; cancelBy?: "CUSTOMER" | "ARTISAN" }[] = [
      ...Array.from({ length: a.jobs }, () => ({
        status: RequestStatus.COMPLETED as RequestStatus,
      })),
      ...Array.from({ length: a.artisanCancels }, () => ({
        status: RequestStatus.CANCELLED as RequestStatus,
        cancelBy: "ARTISAN" as const,
      })),
      ...Array.from({ length: a.customerCancels }, () => ({
        status: RequestStatus.CANCELLED as RequestStatus,
        cancelBy: "CUSTOMER" as const,
      })),
      ...Array.from({ length: a.declines }, () => ({
        status: RequestStatus.DECLINED as RequestStatus,
      })),
      ...Array.from({ length: a.expired }, () => ({
        status: RequestStatus.EXPIRED as RequestStatus,
      })),
    ];
    for (let i = plan.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [plan[i], plan[j]] = [plan[j] as (typeof plan)[number], plan[i] as (typeof plan)[number]];
    }
    plan.forEach((p, idx) => {
      const c = asCustomer(rng.chance(0.4) ? rng.pick(regulars) : rng.pick(pool));
      const createdAt = now - (6 + ((total - idx) / total) * 420 - rng.next() * 3) * DAY; // spread over ~14 months, oldest first
      buildRequest({
        status: p.status,
        ...(p.cancelBy ? { cancelBy: p.cancelBy } : {}),
        customerUserId: c.id,
        customer: c.loc,
        artisan: a,
        category: rng.pick(a.cats),
        createdAt: Math.min(createdAt, now - 5 * DAY),
        viaQuote: p.status === "COMPLETED" && rng.chance(0.3),
      });
    });
  }

  // Ovie (artisan) also books an electrician as a customer: one account, two profiles.
  const ovie = ARTISANS.find((x) => x.key === "edafe") as ArtisanSeed;
  const briggs = ARTISANS.find((x) => x.key === "briggs") as ArtisanSeed;
  buildRequest({
    status: RequestStatus.COMPLETED,
    customerUserId: artisanUserIds.get("edafe") as string,
    customer: { city: "Port Harcourt", area: ovie.area, lat: ovie.lat, lng: ovie.lng },
    artisan: briggs,
    category: "electrician",
    createdAt: now - 40 * DAY,
    review: true,
    quality: 1,
  });

  // ── Showcase: one live request in every status ─────────────────────
  const A = (k: string) => ARTISANS.find((x) => x.key === k) as ArtisanSeed;
  const C = (k: string) => {
    const c = CUSTOMERS.find((x) => x.key === k) as CustomerSeed;
    return asCustomer(c);
  };
  const show = (
    status: RequestStatus,
    cust: string,
    art: string,
    category: string,
    ageMin: number,
    extra: Partial<Spec> = {},
  ) => {
    const c = C(cust);
    return buildRequest({
      status,
      customerUserId: c.id,
      customer: c.loc,
      artisan: A(art),
      category,
      createdAt: now - ageMin * MIN,
      ...extra,
    });
  };
  const showPending = show(RequestStatus.PENDING, "adaeze", "briggs", "electrician", 12, {
    immediate: true,
  });
  show(RequestStatus.QUOTED, "adaeze", "wogu", "plumber", 180, {
    viaQuote: true,
    immediate: false,
  });
  const showAccepted = show(RequestStatus.ACCEPTED, "adaeze", "jaja", "ac-technician", 300, {
    immediate: false,
  });
  const showEnRoute = show(RequestStatus.EN_ROUTE, "ifeanyi", "ikpe", "generator-technician", 150, {
    immediate: true,
    respSec: 240,
  });
  const showInProgress = show(
    RequestStatus.IN_PROGRESS,
    "blessing",
    "edafe",
    "auto-mechanic",
    300,
    { immediate: true, respSec: 600 },
  );
  show(RequestStatus.AWAITING_CONFIRMATION, "adaeze", "briggs", "electrician", 600, {
    immediate: true,
    respSec: 300,
  });
  show(RequestStatus.COMPLETED, "ifeanyi", "wogu", "plumber", 1500, {
    review: false,
    respSec: 420,
  }); // completed, awaiting the customer's review
  show(RequestStatus.DECLINED, "blessing", "briggs", "electrician", 900);
  show(RequestStatus.CANCELLED, "adaeze", "jaja", "ac-technician", 2000, { cancelBy: "CUSTOMER" });
  show(RequestStatus.CANCELLED, "ifeanyi", "ikpe", "generator-technician", 2600, {
    cancelBy: "ARTISAN",
  });
  show(RequestStatus.EXPIRED, "blessing", "wogu", "plumber", 3200);
  const showDisputed = show(RequestStatus.DISPUTED, "ifeanyi", "edafe", "auto-mechanic", 4300, {
    respSec: 900,
  });
  show(RequestStatus.PENDING, "chiamaka", "adeyemi", "electrician", 25, { immediate: true });
  show(RequestStatus.ACCEPTED, "hauwa", "sani", "electrician", 200, { immediate: false });

  // Chat on live requests.
  const chat = (b: Built, lines: [boolean, string, number][]) => {
    const base = (t.requests.find((r) => r.id === b.id)?.createdAt as Date).getTime();
    lines.forEach(([fromArtisan, body, offsetMin]) => {
      const sender = fromArtisan
        ? (artisanUserIds.get(b.spec.artisan.key) as string)
        : b.spec.customerUserId;
      t.messages.push({
        id: uuidv7(base + offsetMin * MIN),
        requestId: b.id,
        senderId: sender,
        body,
        createdAt: new Date(base + offsetMin * MIN),
      });
    });
  };
  chat(showAccepted, [
    [false, "Good evening, is 10am tomorrow still okay?", 310],
    [true, "Yes ma, I will be there by 10. Please keep the unit switched off.", 318],
  ]);
  chat(showEnRoute, [
    [true, "I am on my way, about 15 minutes from Rumuokoro junction.", 160],
    [false, "Okay, the gate is the blue one.", 162],
  ]);
  chat(showInProgress, [
    [true, "Found the fault: worn serpentine belt. I can replace it today.", 330],
    [false, "Please go ahead.", 333],
  ]);
  chat(showPending, []);

  // ── Complaints, disputes, reports ──────────────────────────────────
  const completedFor = (key: string) =>
    built.filter(
      (b) =>
        b.spec.artisan.key === key &&
        b.spec.status === RequestStatus.COMPLETED &&
        b.confirmedAt &&
        b.spec.review !== false,
    );
  const complain = (
    b: Built,
    category: ComplaintCategory,
    severity: ComplaintSeverity,
    status: ComplaintStatus,
    description: string,
  ) => {
    const at = (b.confirmedAt ?? now - 10 * DAY) + 2 * DAY;
    t.complaints.push({
      id: uuidv7(at),
      requestId: b.id,
      filedById: b.spec.customerUserId,
      filedByRole: ActorType.CUSTOMER,
      againstUserId: artisanUserIds.get(b.spec.artisan.key) as string,
      category,
      severity,
      description,
      status,
      resolutionNote:
        status === "UPHELD"
          ? "Evidence reviewed. Complaint upheld."
          : status === "DISMISSED"
            ? "No evidence of a breach was found."
            : null,
      resolvedById: status === "OPEN" || status === "UNDER_REVIEW" ? null : adminId,
      resolvedAt: status === "OPEN" || status === "UNDER_REVIEW" ? null : new Date(at + 3 * DAY),
      createdAt: new Date(at),
      updatedAt: new Date(at),
    });
  };
  const og = completedFor("ogunleye"),
    ez = completedFor("eze"),
    lw = completedFor("lawal");
  if (og[4])
    complain(
      og[4],
      ComplaintCategory.POOR_WORKMANSHIP,
      ComplaintSeverity.MEDIUM,
      ComplaintStatus.UPHELD,
      "The AC started leaking again two days after the repair.",
    );
  if (og[9])
    complain(
      og[9],
      ComplaintCategory.OVERCHARGING,
      ComplaintSeverity.LOW,
      ComplaintStatus.DISMISSED,
      "Final price was higher than I expected.",
    );
  if (ez[3])
    complain(
      ez[3],
      ComplaintCategory.ABANDONED_JOB,
      ComplaintSeverity.HIGH,
      ComplaintStatus.UPHELD,
      "He left the generator in pieces and did not come back.",
    );
  if (ez[11])
    complain(
      ez[11],
      ComplaintCategory.LATE_ARRIVAL,
      ComplaintSeverity.LOW,
      ComplaintStatus.OPEN,
      "Arrived almost four hours late.",
    );
  if (lw[2])
    complain(
      lw[2],
      ComplaintCategory.RUDE_BEHAVIOUR,
      ComplaintSeverity.LOW,
      ComplaintStatus.UNDER_REVIEW,
      "Shouted at my driver when the quote was questioned.",
    );
  // Open complaint on the disputed job.
  t.complaints.push({
    id: uuidv7(now - 4200 * MIN),
    requestId: showDisputed.id,
    filedById: showDisputed.spec.customerUserId,
    filedByRole: ActorType.CUSTOMER,
    againstUserId: artisanUserIds.get("edafe") as string,
    category: ComplaintCategory.POOR_WORKMANSHIP,
    severity: ComplaintSeverity.MEDIUM,
    description: "The fault is still there after the repair and I was charged in full.",
    status: ComplaintStatus.OPEN,
    createdAt: new Date(now - 4200 * MIN),
    updatedAt: new Date(now - 4200 * MIN),
  });

  const dispute = (
    b: Built,
    status: DisputeStatus,
    reason: string,
    description: string,
    at: number,
    refundKobo?: number,
  ) => {
    const resolved = status !== DisputeStatus.OPEN && status !== DisputeStatus.UNDER_REVIEW;
    t.disputes.push({
      id: uuidv7(at),
      requestId: b.id,
      openedById: b.spec.customerUserId,
      openedByRole: ActorType.CUSTOMER,
      reason,
      description,
      status,
      resolutionNote: resolved
        ? "Resolved by admin after reviewing messages and photos from both sides."
        : null,
      refundAmountKobo: refundKobo ?? null,
      resolvedById: resolved ? adminId : null,
      resolvedAt: resolved ? new Date(at + 2 * DAY) : null,
      createdAt: new Date(at),
      updatedAt: new Date(at),
    });
    if (resolved)
      addEvent(
        b.id,
        RequestEventType.DISPUTE_RESOLVED,
        at + 2 * DAY,
        ActorType.ADMIN,
        adminId,
        null,
        null,
        { status },
      );
  };
  if (ez[6]) {
    addEvent(
      ez[6].id,
      RequestEventType.DISPUTE_OPENED,
      (ez[6].confirmedAt as number) + DAY,
      ActorType.CUSTOMER,
      ez[6].spec.customerUserId,
      null,
      null,
    );
    dispute(
      ez[6],
      DisputeStatus.RESOLVED_FOR_CUSTOMER,
      "Work not completed",
      "Generator still trips under load after being 'fixed'.",
      (ez[6].confirmedAt as number) + DAY,
      1500000,
    );
  }
  if (og[14]) {
    addEvent(
      og[14].id,
      RequestEventType.DISPUTE_OPENED,
      (og[14].confirmedAt as number) + DAY,
      ActorType.CUSTOMER,
      og[14].spec.customerUserId,
      null,
      null,
    );
    dispute(
      og[14],
      DisputeStatus.RESOLVED_FOR_ARTISAN,
      "Overcharged",
      "Quoted ₦15,000, charged ₦22,000.",
      (og[14].confirmedAt as number) + DAY,
    );
  }
  t.disputes.push({
    id: uuidv7(now - 4000 * MIN),
    requestId: showDisputed.id,
    openedById: showDisputed.spec.customerUserId,
    openedByRole: ActorType.CUSTOMER,
    reason: "Work not completed",
    description: "Car still shakes at idle. I asked for a re-inspection and he declined.",
    status: DisputeStatus.OPEN,
    createdAt: new Date(now - 4000 * MIN),
    updatedAt: new Date(now - 4000 * MIN),
  });

  const someReview = t.reviews.find((r) => r.rating === 1);
  if (someReview)
    t.reports.push({
      id: uuidv7(now - 5 * DAY),
      reporterId: artisanUserIds.get("eze") as string,
      targetType: "REVIEW",
      targetReviewId: someReview.id,
      reason: "FAKE_REVIEW",
      details: "I have no record of this customer.",
      createdAt: new Date(now - 5 * DAY),
    });
  t.reports.push({
    id: uuidv7(now - 3 * DAY),
    reporterId: customerIds.get("hauwa") as string,
    targetType: "USER",
    targetUserId: artisanUserIds.get("bello") as string,
    reason: "FAKE_PROFILE",
    details: "Profile photo looks like it was taken from the internet.",
    createdAt: new Date(now - 3 * DAY),
  });

  // ── Verifications ──────────────────────────────────────────────────
  for (const a of ARTISANS) {
    const pid = profileIds.get(a.key) as string;
    const created = now - rng.int(100, 400) * DAY;
    const idType = rng.pick([
      IdDocumentType.NIN,
      IdDocumentType.DRIVERS_LICENCE,
      IdDocumentType.VOTERS_CARD,
      IdDocumentType.INTERNATIONAL_PASSPORT,
    ]);
    const base = {
      artisanId: pid,
      idType,
      documentKey: `seed/private/${a.key}-id.jpg`,
      documentNumberHash: hmac(`${a.key}-id-number`),
      documentLast4: String(rng.int(1000, 9999)),
    };
    if (a.pendingVerification) {
      t.verifications.push({
        id: uuidv7(now - 2 * DAY),
        ...base,
        selfieKey: `seed/private/${a.key}-selfie.jpg`,
        status: VerificationStatus.PENDING,
        createdAt: new Date(now - 2 * DAY),
      });
    } else if (a.level !== "NONE") {
      if (a.key === "eze")
        t.verifications.push({
          id: uuidv7(created - 7 * DAY),
          ...base,
          documentKey: `seed/private/${a.key}-id-blurry.jpg`,
          documentNumberHash: null,
          status: VerificationStatus.REJECTED,
          rejectionReason: "The ID photo was too blurry to read. Please upload a clearer photo.",
          reviewedById: adminId,
          reviewedAt: new Date(created - 6 * DAY),
          createdAt: new Date(created - 7 * DAY),
        });
      t.verifications.push({
        id: uuidv7(created),
        ...base,
        selfieKey: a.level === "ID_VERIFIED" ? null : `seed/private/${a.key}-selfie.jpg`,
        faceMatchScore: a.level === "ID_VERIFIED" ? null : 0.9 + rng.next() * 0.08,
        status: VerificationStatus.APPROVED,
        levelGranted: a.level,
        reviewedById: adminId,
        reviewedAt: new Date(created + DAY),
        createdAt: new Date(created),
      });
    }
  }

  // ── Stats, profiles, categories, availability ──────────────────────
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)] as number;
  };
  for (const a of ARTISANS) {
    const pid = profileIds.get(a.key) as string;
    const mine = t.requests.filter((r) => r.artisanId === pid);
    const done = mine.filter((r) => r.status === "COMPLETED");
    const accepted = mine.filter((r) => r.acceptedAt);
    const artisanCancelled = mine.filter(
      (r) => r.status === "CANCELLED" && r.cancelledByRole === "ARTISAN",
    ).length;
    const ratings = t.reviews.filter((r) => r.artisanId === pid);
    const ratingAverage = ratings.length
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
      : null;
    const respTimes = mine
      .filter((r) => r.firstResponseAt)
      .map((r) => ((r.firstResponseAt as Date).getTime() - (r.createdAt as Date).getTime()) / 1000);
    const customers = new Map<string, number>();
    done.forEach((r) => customers.set(r.customerId, (customers.get(r.customerId) ?? 0) + 1));
    const repeatShare = customers.size
      ? [...customers.values()].filter((n) => n > 1).length / customers.size
      : 0;
    const upheld = t.complaints.filter(
      (c) => c.againstUserId === artisanUserIds.get(a.key) && c.status === "UPHELD",
    ).length;
    const lost = t.disputes.filter(
      (d) => d.status === "RESOLVED_FOR_CUSTOMER" && mine.some((r) => r.id === d.requestId),
    ).length;

    // Interim denormalised score for demo data only. The trust engine (Phase 5) owns this value and
    // overwrites it; the real formula is documented in docs/trust-score.md once that phase lands.
    const completionRate = accepted.length
      ? done.length / (done.length + artisanCancelled + 2)
      : null;
    const med = median(respTimes);
    const verifPts = { NONE: 0, ID_VERIFIED: 5, ID_SELFIE_VERIFIED: 8, ADMIN_REVIEWED: 10 }[
      a.level
    ];
    let score =
      20 * (1 - Math.exp(-done.length / 30)) +
      15 * (completionRate ?? 0) +
      15 * Math.max(0, 1 - (artisanCancelled / Math.max(1, done.length + artisanCancelled)) * 8) +
      (15 - Math.min(15, upheld * 5)) +
      10 * Math.max(0, 1 - (med ?? 14400) / 14400) +
      verifPts +
      8 * Math.min(1, repeatShare * 2.5) +
      (7 - Math.min(7, lost * 4)) +
      (ratingAverage ? (ratingAverage - 3) * 1.5 : 0);
    score *= 0.55 + 0.45 * (done.length / (done.length + 30)); // little history means less confidence
    if (done.length < 5) score = Math.min(score, 30);
    score = Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
    const tier =
      done.length < 5 || score < 45
        ? TrustTier.NEW
        : score >= 85
          ? TrustTier.TOP_RATED
          : score >= 70
            ? TrustTier.HIGHLY_TRUSTED
            : TrustTier.TRUSTED;

    t.profiles.push({
      id: pid,
      userId: artisanUserIds.get(a.key) as string,
      businessName: a.business,
      bio: a.bio,
      yearsExperience: a.years,
      status: a.profile,
      verificationLevel: a.level,
      lat: a.lat,
      lng: a.lng,
      areaLabel: `${a.area}, ${a.city}`,
      city: a.city,
      state: STATE[a.city],
      serviceRadiusKm: a.city === "Lagos" ? 12 : 15,
      calloutMinKobo: a.minNaira * 100,
      calloutMaxKobo: a.maxNaira * 100,
      isAvailableNow: a.availableNow,
      availableNowUntil: a.availableNow ? new Date(now + 6 * HOUR) : null,
      responseTimeMedianSec: med === null ? null : Math.round(med),
      whatsappNumber:
        (t.users.find((u) => u.id === artisanUserIds.get(a.key))?.phone as string) ?? null,
      trustScore: score,
      trustTier: tier,
      completedJobsCount: done.length,
      completionRate: completionRate === null ? null : Math.round(completionRate * 1000) / 1000,
      ratingAverage,
      ratingCount: ratings.length,
      trustComputedAt: new Date(now),
      createdAt: new Date(now - 300 * DAY),
      updatedAt: new Date(now),
    });
    a.cats.forEach((slug, i) =>
      t.artisanCategories.push({ artisanId: pid, categoryId: catId(slug), isPrimary: i === 0 }),
    );
    for (let d = 1; d <= 6; d++)
      t.availability.push({
        id: uuidv7(now - 300 * DAY + d),
        artisanId: pid,
        dayOfWeek: d % 7,
        startMinute: 8 * 60,
        endMinute: d === 6 ? 14 * 60 : 18 * 60,
      });
  }

  // ── Favourites & notifications ─────────────────────────────────────
  for (const [c, a] of [
    ["adaeze", "briggs"],
    ["adaeze", "wogu"],
    ["ifeanyi", "wogu"],
    ["chiamaka", "adeyemi"],
    ["hauwa", "danjuma"],
  ] as const) {
    t.favorites.push({
      userId: customerIds.get(c) as string,
      artisanId: profileIds.get(a) as string,
      createdAt: new Date(now - rng.int(1, 60) * DAY),
    });
  }
  const note = (
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    ageMin: number,
    read = false,
  ) =>
    t.notifications.push({
      id: uuidv7(now - ageMin * MIN),
      userId,
      type,
      title,
      body,
      readAt: read ? new Date(now - (ageMin - 5) * MIN) : null,
      createdAt: new Date(now - ageMin * MIN),
    });
  note(
    artisanUserIds.get("briggs") as string,
    NotificationType.REQUEST_RECEIVED,
    "New request in Rumuola",
    "Sockets keep tripping the breaker. Tap to respond.",
    12,
  );
  note(
    customerIds.get("adaeze") as string,
    NotificationType.QUOTE_RECEIVED,
    "You have a quote",
    "Emeka Wogu quoted for your plumbing request.",
    150,
  );
  note(
    customerIds.get("adaeze") as string,
    NotificationType.JOB_MARKED_COMPLETE,
    "Job marked complete",
    "Please confirm the work so Briggs Electrical Works gets credit.",
    40,
  );
  note(
    customerIds.get("ifeanyi") as string,
    NotificationType.ARTISAN_EN_ROUTE,
    "Sunday Ikpe is on the way",
    "Your technician left a few minutes ago.",
    140,
    true,
  );

  // ── Insert in FK order ─────────────────────────────────────────────
  const chunks = <T>(xs: T[], n = 1000) =>
    Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
  const insert = async <T>(rows: T[], fn: (batch: T[]) => Promise<unknown>) => {
    for (const c of chunks(rows)) await fn(c);
  };

  await insert(t.users, (data) => db.user.createMany({ data }));
  await insert(t.profiles, (data) => db.artisanProfile.createMany({ data }));
  await insert(t.artisanCategories, (data) => db.artisanCategory.createMany({ data }));
  await insert(t.availability, (data) => db.availabilitySlot.createMany({ data }));
  await insert(t.verifications, (data) => db.identityVerification.createMany({ data }));
  await insert(t.requests, (data) => db.serviceRequest.createMany({ data }));
  await insert(t.events, (data) => db.requestEvent.createMany({ data }));
  await insert(t.quotes, (data) => db.quote.createMany({ data }));
  await insert(t.reviews, (data) => db.review.createMany({ data }));
  await insert(t.messages, (data) => db.message.createMany({ data }));
  await insert(t.complaints, (data) => db.complaint.createMany({ data }));
  await insert(t.disputes, (data) => db.dispute.createMany({ data }));
  await insert(t.reports, (data) => db.report.createMany({ data }));
  await insert(t.favorites, (data) => db.favorite.createMany({ data }));
  await insert(t.notifications, (data) => db.notification.createMany({ data }));

  const byStatus = t.requests.reduce<Record<string, number>>(
    (m, r) => ((m[r.status as string] = (m[r.status as string] ?? 0) + 1), m),
    {},
  );
  console.log(
    `  users ${t.users.length}, artisans ${t.profiles.length}, requests ${t.requests.length}, events ${t.events.length}, reviews ${t.reviews.length}`,
  );
  console.log(
    `  complaints ${t.complaints.length}, disputes ${t.disputes.length}, reports ${t.reports.length}`,
  );
  console.log(`  requests by status: ${JSON.stringify(byStatus)}`);
}
