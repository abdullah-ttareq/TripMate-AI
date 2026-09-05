/**
 * Which everyday apps actually work at a destination.
 *
 * This is a hand-curated list, deliberately not generated. Asking a language
 * model "which delivery apps work in Japan" produces confident, plausible,
 * sometimes wrong answers — including apps that never existed or shut down
 * years ago — and every entry here is a link a traveller might rely on abroad.
 * Curated data is checkable; generated data is not.
 *
 * Every `url` points at an official site. Adding a country means adding one
 * entry below and nothing else: the UI reads whatever is here.
 *
 * A destination with no entry shows an unavailable state. It does not fall
 * back to a guess.
 */

export type AppCategory =
  | "food"
  | "taxi"
  | "transport"
  | "navigation"
  | "communication";

/** Order the categories appear in. */
export const APP_CATEGORIES: AppCategory[] = [
  "food",
  "taxi",
  "transport",
  "navigation",
  "communication",
];

export type UsefulApp = {
  name: string;
  category: AppCategory;
  description: { en: string; ar: string };
  url: string;
};

const GOOGLE_MAPS: UsefulApp = {
  name: "Google Maps",
  category: "navigation",
  description: {
    en: "Directions, transit times and opening hours.",
    ar: "الاتجاهات وأوقات النقل ومواعيد العمل.",
  },
  url: "https://www.google.com/maps",
};

const WHATSAPP: UsefulApp = {
  name: "WhatsApp",
  category: "communication",
  description: {
    en: "The default way most places will contact you.",
    ar: "الوسيلة الأكثر استخداماً للتواصل في معظم الأماكن.",
  },
  url: "https://www.whatsapp.com",
};

const UBER: UsefulApp = {
  name: "Uber",
  category: "taxi",
  description: {
    en: "Ride hailing, with fares agreed before you travel.",
    ar: "طلب سيارة مع معرفة الأجرة قبل الانطلاق.",
  },
  url: "https://www.uber.com",
};

/**
 * Keyed by ISO 3166-1 alpha-2, uppercase.
 *
 * Six countries is a deliberate starting set, not a limitation: one contrasting
 * region each for the Gulf, East Asia, Europe and North America, which is
 * enough to show the feature works and to make the shape obvious for whoever
 * adds the seventh.
 */
export const USEFUL_APPS: Record<string, UsefulApp[]> = {
  SA: [
    {
      name: "HungerStation",
      category: "food",
      description: {
        en: "The widest restaurant and grocery coverage in the Kingdom.",
        ar: "الأوسع تغطية للمطاعم والبقالة في المملكة.",
      },
      url: "https://hungerstation.com",
    },
    {
      name: "Jahez",
      category: "food",
      description: {
        en: "Saudi delivery app, strong outside the largest cities.",
        ar: "تطبيق توصيل سعودي، تغطيته جيدة خارج المدن الكبرى.",
      },
      url: "https://www.jahez.net",
    },
    {
      name: "Careem",
      category: "taxi",
      description: {
        en: "Rides, and widely used for deliveries and payments too.",
        ar: "توصيل الركاب، ويُستخدم أيضاً للتوصيل والمدفوعات.",
      },
      url: "https://www.careem.com",
    },
    UBER,
    {
      name: "Darb",
      category: "transport",
      description: {
        en: "Riyadh Metro and bus tickets and journey planning.",
        ar: "تذاكر مترو وحافلات الرياض وتخطيط الرحلات.",
      },
      url: "https://darb.rcrc.gov.sa",
    },
    GOOGLE_MAPS,
    WHATSAPP,
  ],

  AE: [
    {
      name: "Talabat",
      category: "food",
      description: {
        en: "Restaurant and grocery delivery across the Emirates.",
        ar: "توصيل المطاعم والبقالة في جميع الإمارات.",
      },
      url: "https://www.talabat.com",
    },
    {
      name: "Deliveroo",
      category: "food",
      description: {
        en: "Strong restaurant selection in Dubai and Abu Dhabi.",
        ar: "خيارات مطاعم واسعة في دبي وأبوظبي.",
      },
      url: "https://deliveroo.ae",
    },
    {
      name: "Careem",
      category: "taxi",
      description: {
        en: "The most widely used ride app in the UAE.",
        ar: "التطبيق الأكثر استخداماً لطلب السيارات في الإمارات.",
      },
      url: "https://www.careem.com",
    },
    UBER,
    {
      name: "S'hail",
      category: "transport",
      description: {
        en: "Dubai metro, tram and bus routes from the transport authority.",
        ar: "مسارات مترو وترام وحافلات دبي من هيئة الطرق والمواصلات.",
      },
      url: "https://www.rta.ae",
    },
    GOOGLE_MAPS,
    {
      name: "Botim",
      category: "communication",
      description: {
        en: "A licensed calling app; some voice apps are restricted locally.",
        ar: "تطبيق اتصال مرخّص؛ بعض تطبيقات الاتصال مقيّدة محلياً.",
      },
      url: "https://www.botim.me",
    },
    WHATSAPP,
  ],

  JP: [
    {
      name: "Uber Eats",
      category: "food",
      description: {
        en: "The easiest delivery app to use in English.",
        ar: "أسهل تطبيق توصيل للاستخدام بالإنجليزية.",
      },
      url: "https://www.ubereats.com",
    },
    {
      name: "Demae-can",
      category: "food",
      description: {
        en: "Long-established Japanese delivery service.",
        ar: "خدمة توصيل يابانية عريقة.",
      },
      url: "https://demae-can.com",
    },
    {
      name: "GO",
      category: "taxi",
      description: {
        en: "The main taxi-hailing app in Japanese cities.",
        ar: "التطبيق الرئيسي لطلب سيارات الأجرة في المدن اليابانية.",
      },
      url: "https://go.mo-t.com",
    },
    {
      name: "Suica",
      category: "transport",
      description: {
        en: "Rechargeable card for trains, buses and convenience stores.",
        ar: "بطاقة قابلة للشحن للقطارات والحافلات والمتاجر.",
      },
      url: "https://www.jreast.co.jp/multi/en/pass/suica.html",
    },
    {
      name: "Japan Transit Planner",
      category: "transport",
      description: {
        en: "Train routes and times, including which carriage to board.",
        ar: "مسارات القطارات وأوقاتها، وحتى العربة المناسبة للركوب.",
      },
      url: "https://www.japantransitplanner.com",
    },
    GOOGLE_MAPS,
    {
      name: "LINE",
      category: "communication",
      description: {
        en: "The default messaging app in Japan, ahead of WhatsApp.",
        ar: "تطبيق المراسلة الأشهر في اليابان، أكثر من واتساب.",
      },
      url: "https://line.me",
    },
  ],

  GB: [
    {
      name: "Deliveroo",
      category: "food",
      description: {
        en: "Restaurant delivery in most towns and cities.",
        ar: "توصيل المطاعم في معظم المدن والبلدات.",
      },
      url: "https://deliveroo.co.uk",
    },
    {
      name: "Just Eat",
      category: "food",
      description: {
        en: "The widest takeaway coverage outside big cities.",
        ar: "الأوسع تغطية للوجبات خارج المدن الكبرى.",
      },
      url: "https://www.just-eat.co.uk",
    },
    UBER,
    {
      name: "Bolt",
      category: "taxi",
      description: {
        en: "Often cheaper than the alternatives on the same route.",
        ar: "غالباً أرخص من غيره على المسار نفسه.",
      },
      url: "https://bolt.eu",
    },
    {
      name: "Citymapper",
      category: "transport",
      description: {
        en: "Better than most maps for London buses and the Underground.",
        ar: "أفضل من معظم الخرائط لحافلات لندن ومترو الأنفاق.",
      },
      url: "https://citymapper.com",
    },
    {
      name: "TfL Go",
      category: "transport",
      description: {
        en: "Official London transport app with live status.",
        ar: "التطبيق الرسمي لمواصلات لندن مع حالة الخطوط مباشرة.",
      },
      url: "https://tfl.gov.uk",
    },
    GOOGLE_MAPS,
    WHATSAPP,
  ],

  FR: [
    {
      name: "Uber Eats",
      category: "food",
      description: {
        en: "Broad restaurant delivery coverage.",
        ar: "تغطية واسعة لتوصيل المطاعم.",
      },
      url: "https://www.ubereats.com",
    },
    {
      name: "Deliveroo",
      category: "food",
      description: {
        en: "Strong in Paris and the larger cities.",
        ar: "قوي في باريس والمدن الكبرى.",
      },
      url: "https://deliveroo.fr",
    },
    UBER,
    {
      name: "G7",
      category: "taxi",
      description: {
        en: "The established Paris taxi network.",
        ar: "شبكة سيارات الأجرة المعروفة في باريس.",
      },
      url: "https://www.g7.fr",
    },
    {
      name: "SNCF Connect",
      category: "transport",
      description: {
        en: "National rail tickets and timetables.",
        ar: "تذاكر ومواعيد القطارات الوطنية.",
      },
      url: "https://www.sncf-connect.com",
    },
    {
      name: "Bonjour RATP",
      category: "transport",
      description: {
        en: "Official Paris metro, bus and RER app.",
        ar: "التطبيق الرسمي لمترو وحافلات باريس و RER.",
      },
      url: "https://www.ratp.fr",
    },
    GOOGLE_MAPS,
    WHATSAPP,
  ],

  US: [
    {
      name: "DoorDash",
      category: "food",
      description: {
        en: "The widest delivery coverage nationally.",
        ar: "الأوسع تغطية للتوصيل على مستوى البلاد.",
      },
      url: "https://www.doordash.com",
    },
    {
      name: "Uber Eats",
      category: "food",
      description: {
        en: "Useful if you already have an Uber account.",
        ar: "مفيد إن كان لديك حساب أوبر بالفعل.",
      },
      url: "https://www.ubereats.com",
    },
    UBER,
    {
      name: "Lyft",
      category: "taxi",
      description: {
        en: "The main alternative to Uber; worth comparing fares.",
        ar: "البديل الرئيسي لأوبر، وتستحق المقارنة بين الأجرتين.",
      },
      url: "https://www.lyft.com",
    },
    {
      name: "Transit",
      category: "transport",
      description: {
        en: "Live bus and rail times in most US cities.",
        ar: "أوقات الحافلات والقطارات مباشرة في معظم المدن.",
      },
      url: "https://transitapp.com",
    },
    GOOGLE_MAPS,
    WHATSAPP,
  ],
};

/**
 * Apps for a country, or null when nothing is curated for it.
 *
 * Null is a real answer here and the UI must show it as one. Falling back to a
 * neighbouring country's apps would be a quiet lie.
 */
export function usefulAppsFor(countryCode: string | null | undefined) {
  if (!countryCode) return null;

  return USEFUL_APPS[countryCode.toUpperCase()] ?? null;
}
