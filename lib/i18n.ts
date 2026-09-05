export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie the chosen language is stored in, read on the server and the client. */
export const LOCALE_COOKIE = "tripmate:lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Every user-visible string.
 *
 * English is the source of truth: the Arabic object is typed against it, so a
 * missing translation is a compile error rather than an English word appearing
 * in an Arabic page.
 */
const en = {
  nav: {
    home: "Home",
    plan: "Plan",
    myTrips: "My Trips",
    signIn: "Sign in",
    signOut: "Sign out",
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
    toArabic: "التبديل إلى العربية",
    toEnglish: "Switch to English",
  },

  home: {
    eyebrow: "Saudi Arabia & beyond",
    titleLine1: "Every journey,",
    titleEmphasis: "thoughtfully",
    titleLine2: "planned.",
    lede: "Tell us where you are going and what you can spend. We build the days around it — honestly, down to the last riyal.",
    planTrip: "Plan a trip",
    myTrips: "My trips",
    points: [
      "Real, named places — not filler",
      "Costs broken down day by day",
      "Told honestly when a budget will not stretch",
    ],
    budgetLabel: "Budget",
    budgetNote: "within your 5,000",
    whereNext: "Where to next",
    popular: "Popular in Saudi Arabia",
    nights: "nights",
    from: "from",
    steps: [
      {
        title: "Smart Itineraries",
        body: "Real places with real names — grouped so a day does not cross the city twice.",
      },
      {
        title: "Budget Optimization",
        body: "Costs broken down day by day. If your budget will not stretch, we say so instead of inventing prices.",
      },
      {
        title: "Saved and Yours",
        body: "Every trip keeps its own address. Come back to it, or delete it, whenever you like.",
      },
    ],
    ctaTitle: "Ready when you are",
    ctaBody: "One form. Sixty seconds. A plan you can actually afford.",
    ctaButton: "Start planning",
  },

  plan: {
    eyebrow: "New trip",
    title: "Plan Your Trip",
    subtitle: "Five details. That is all we need.",
    from: "From",
    destination: "Destination",
    date: "Departure Date",
    budget: "Budget (SAR)",
    days: "Number of Days",
    submit: "Generate Trip",
    submitting: "Generating your trip...",
    patience: "This can take up to a minute. Please keep this page open.",
    unreachable: "Could not reach the server. Check your connection and try again.",
    generic: "Something went wrong. Please try again.",
  },

  result: {
    departing: "Departing",
    save: "Save trip",
    saving: "Saving...",
    planAnother: "Plan another",
    myTrips: "My trips",
    budgetNote: "Budget note",
    destination: "Destination",
    duration: "Duration",
    estimatedCost: "Estimated cost",
    day: "day",
    days: "days",
    yourDays: "Your days",
    tapHint: "Tap a day for details",
    activity: "activity",
    activities: "activities",
    goodToKnow: "Good to know",
    noTripTitle: "No trip to show",
    noTripBody: "Your generated trip is not available anymore. Plan a new one to get started.",
    planTrip: "Plan a trip",
    loading: "Loading your trip...",
    loadFailTitle: "Could not load this trip",
    loadFailBody: "Please try again in a moment.",
    backToTrips: "Back to My Trips",
    viewOnMaps: "View on Google Maps",
    photoVia: "Photo via Wikipedia",
    photoViaCommons: "Photo via Wikimedia Commons",
    mapTab: "Map",
    mapHint: "Tap a pin for details",
    mapEmpty: "None of this trip's places could be matched to a location on the map.",
  },

  myTrips: {
    eyebrow: "Saved",
    title: "My Trips",
    countOne: "trip planned",
    countMany: "trips planned",
    emptyLede: "Everything you save lives here.",
    planNew: "Plan new trip",
    loadError: "Could not load your trips. Please refresh the page.",
    emptyTitle: "No trips yet",
    emptyBody: "Plan your first trip and save it — it will be waiting here when you come back.",
    duration: "Duration",
    cost: "Cost",
    departs: "Departs",
    view: "View trip",
    day: "day",
    days: "days",
  },

  delete: {
    button: "Delete",
    confirmPrefix: "Delete",
    confirmSuffix: "? This cannot be undone.",
    yes: "Yes, delete",
    no: "Keep it",
    deleting: "Deleting...",
    failed: "Could not delete this trip.",
    unreachable: "Could not reach the server. Please try again.",
  },

  auth: {
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to plan and save your trips",
    signUpTitle: "Create account",
    signUpSubtitle: "Start planning trips in seconds",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "At least 8 characters",
    signIn: "Sign In",
    createAccount: "Create Account",
    working: "Please wait...",
    haveAccount: "Already have an account?",
    noAccount: "No account yet?",
    goSignIn: "Sign in",
    goSignUp: "Create one",
    accountCreatedSignIn: "Account created. Please sign in to continue.",
    badCredentials: "Email or password is incorrect.",
    notConfirmed: "Confirm your email first. Check your inbox for the link we sent.",
    unreachable: "Could not reach the server. Check your connection and try again.",
    loading: "Loading...",
  },

  common: {
    sar: "SAR",
  },

  sections: {
    usefulApps: "Useful apps",
    usefulAppsLede: "What people actually use where you are going.",
    appsUnavailable:
      "We do not have checked app suggestions for this destination yet.",
    localEssentials: "Local essentials",
    beforeYouGo: "Before you go",
    beforeYouGoLede: "A short list to run through before you travel.",
  },

  appCategories: {
    food: "Food delivery",
    taxi: "Taxi and ride hailing",
    transport: "Public transport",
    navigation: "Navigation",
    communication: "Communication",
  },

  essentials: {
    currency: "Currency",
    language: "Language",
    emergency: "Emergency number",
    plug: "Power plug",
    timezone: "Time zone",
  },

  checklist: {
    passport: "Passport or national ID",
    entry: "Check the entry requirements for this destination",
    esim: "Mobile data or an eSIM",
    adapter: "Power adapter",
    transport: "Set up a transport or ride-hailing app",
    clothing: "Clothing suited to the season",
    offlineMaps: "Download offline maps",
    money: "A payment method that works abroad",
    done: "done",
  },

  translate: {
    working: "Translating this trip...",
    failed: "Part of this trip could not be translated and is shown as written.",
  },

  footer: {
    rights: "© 2026 TripMate AI. All rights reserved.",
    photos: "Photography via Unsplash",
  },
};
// No `as const` here on purpose: it would type every entry as its exact
// English string, and the Arabic translations below would then fail to match.

/** Typed against `en`, so every key must be translated. */
const ar: typeof en = {
  nav: {
    home: "الرئيسية",
    plan: "خطّط",
    myTrips: "رحلاتي",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    toLight: "التبديل إلى الوضع الفاتح",
    toDark: "التبديل إلى الوضع الداكن",
    toArabic: "التبديل إلى العربية",
    toEnglish: "Switch to English",
  },

  home: {
    eyebrow: "السعودية وما وراءها",
    titleLine1: "كل رحلة،",
    titleEmphasis: "مخطّطة",
    titleLine2: "بعناية.",
    lede: "أخبرنا إلى أين تسافر وكم تستطيع أن تنفق، ونبني لك الأيام على هذا الأساس — بصدق، وحتى آخر ريال.",
    planTrip: "خطّط رحلة",
    myTrips: "رحلاتي",
    points: [
      "أماكن حقيقية بأسمائها، لا حشو",
      "التكاليف موزّعة يوماً بيوم",
      "نخبرك بصراحة إن كانت الميزانية لا تكفي",
    ],
    budgetLabel: "الميزانية",
    budgetNote: "ضمن حدّ الـ 5,000",
    whereNext: "إلى أين بعد؟",
    popular: "الأكثر طلباً في السعودية",
    nights: "ليالٍ",
    from: "تبدأ من",
    steps: [
      {
        title: "برامج ذكية",
        body: "أماكن حقيقية بأسمائها — مرتّبة بحيث لا يقطع اليوم المدينة مرتين.",
      },
      {
        title: "ضبط الميزانية",
        body: "التكاليف موزّعة يوماً بيوم. وإن كانت ميزانيتك لا تكفي، نقولها لك بدل اختلاق الأسعار.",
      },
      {
        title: "محفوظة وملكك",
        body: "لكل رحلة رابطها الخاص. عُد إليها، أو احذفها، متى شئت.",
      },
    ],
    ctaTitle: "جاهزون متى ما كنت",
    ctaBody: "نموذج واحد. ستون ثانية. وخطة تقدر عليها فعلاً.",
    ctaButton: "ابدأ التخطيط",
  },

  plan: {
    eyebrow: "رحلة جديدة",
    title: "خطّط رحلتك",
    subtitle: "خمس معلومات فقط، لا أكثر.",
    from: "من",
    destination: "الوجهة",
    date: "تاريخ المغادرة",
    budget: "الميزانية (ريال)",
    days: "عدد الأيام",
    submit: "أنشئ الرحلة",
    submitting: "جارٍ إنشاء رحلتك...",
    patience: "قد يستغرق هذا دقيقة. أبقِ الصفحة مفتوحة من فضلك.",
    unreachable: "تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مجدداً.",
    generic: "حدث خطأ ما. حاول مرة أخرى.",
  },

  result: {
    departing: "المغادرة",
    save: "احفظ الرحلة",
    saving: "جارٍ الحفظ...",
    planAnother: "خطّط رحلة أخرى",
    myTrips: "رحلاتي",
    budgetNote: "ملاحظة على الميزانية",
    destination: "الوجهة",
    duration: "المدة",
    estimatedCost: "التكلفة التقديرية",
    day: "يوم",
    days: "أيام",
    yourDays: "أيامك",
    tapHint: "اضغط على أي يوم للتفاصيل",
    activity: "نشاط",
    activities: "أنشطة",
    goodToKnow: "معلومات مفيدة",
    noTripTitle: "لا توجد رحلة لعرضها",
    noTripBody: "رحلتك لم تعد متاحة. خطّط رحلة جديدة للبدء.",
    planTrip: "خطّط رحلة",
    loading: "جارٍ تحميل رحلتك...",
    loadFailTitle: "تعذّر تحميل هذه الرحلة",
    loadFailBody: "حاول مرة أخرى بعد قليل.",
    backToTrips: "العودة إلى رحلاتي",
    viewOnMaps: "عرض على خرائط جوجل",
    photoVia: "الصورة من ويكيبيديا",
    photoViaCommons: "الصورة من ويكيميديا كومنز",
    mapTab: "الخريطة",
    mapHint: "اضغط على أي علامة للتفاصيل",
    mapEmpty: "لم نتمكّن من تحديد موقع أي من أماكن هذه الرحلة على الخريطة.",
  },

  myTrips: {
    eyebrow: "المحفوظة",
    title: "رحلاتي",
    countOne: "رحلة مخطّطة",
    countMany: "رحلات مخطّطة",
    emptyLede: "كل ما تحفظه يعيش هنا.",
    planNew: "خطّط رحلة جديدة",
    loadError: "تعذّر تحميل رحلاتك. حدّث الصفحة من فضلك.",
    emptyTitle: "لا توجد رحلات بعد",
    emptyBody: "خطّط رحلتك الأولى واحفظها — ستجدها هنا في انتظارك.",
    duration: "المدة",
    cost: "التكلفة",
    departs: "المغادرة",
    view: "عرض الرحلة",
    day: "يوم",
    days: "أيام",
  },

  delete: {
    button: "حذف",
    confirmPrefix: "حذف",
    confirmSuffix: "؟ لا يمكن التراجع عن هذا.",
    yes: "نعم، احذفها",
    no: "احتفظ بها",
    deleting: "جارٍ الحذف...",
    failed: "تعذّر حذف هذه الرحلة.",
    unreachable: "تعذّر الوصول إلى الخادم. حاول مرة أخرى.",
  },

  auth: {
    signInTitle: "أهلاً بعودتك",
    signInSubtitle: "سجّل الدخول لتخطيط رحلاتك وحفظها",
    signUpTitle: "إنشاء حساب",
    signUpSubtitle: "ابدأ التخطيط خلال ثوانٍ",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "٨ أحرف على الأقل",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء الحساب",
    working: "لحظة من فضلك...",
    haveAccount: "لديك حساب بالفعل؟",
    noAccount: "ليس لديك حساب؟",
    goSignIn: "سجّل الدخول",
    goSignUp: "أنشئ حساباً",
    accountCreatedSignIn: "تم إنشاء الحساب. سجّل الدخول للمتابعة.",
    badCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    notConfirmed: "أكّد بريدك أولاً. تحقّق من صندوق الوارد بحثاً عن الرابط الذي أرسلناه.",
    unreachable: "تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مجدداً.",
    loading: "جارٍ التحميل...",
  },

  common: {
    sar: "ريال",
  },

  sections: {
    usefulApps: "تطبيقات مفيدة",
    usefulAppsLede: "ما يستخدمه الناس فعلاً في وجهتك.",
    appsUnavailable: "لا تتوفّر لدينا اقتراحات تطبيقات موثّقة لهذه الوجهة بعد.",
    localEssentials: "أساسيات الوجهة",
    beforeYouGo: "قبل أن تسافر",
    beforeYouGoLede: "قائمة قصيرة راجعها قبل السفر.",
  },

  appCategories: {
    food: "توصيل الطعام",
    taxi: "سيارات الأجرة والتوصيل",
    transport: "النقل العام",
    navigation: "الخرائط والملاحة",
    communication: "التواصل",
  },

  essentials: {
    currency: "العملة",
    language: "اللغة",
    emergency: "رقم الطوارئ",
    plug: "نوع القابس",
    timezone: "المنطقة الزمنية",
  },

  checklist: {
    passport: "جواز السفر أو الهوية الوطنية",
    entry: "تحقّق من متطلبات الدخول لهذه الوجهة",
    esim: "باقة بيانات أو شريحة eSIM",
    adapter: "محوّل كهرباء",
    transport: "جهّز تطبيق تنقّل أو توصيل",
    clothing: "ملابس مناسبة للموسم",
    offlineMaps: "حمّل الخرائط للاستخدام دون إنترنت",
    money: "وسيلة دفع تعمل خارج البلد",
    done: "مكتملة",
  },

  translate: {
    working: "جارٍ ترجمة الرحلة...",
    failed: "تعذّرت ترجمة جزء من هذه الرحلة، وهو معروض كما كُتب.",
  },

  footer: {
    rights: "© 2026 TripMate AI. جميع الحقوق محفوظة.",
    photos: "الصور من Unsplash",
  },
};

const DICTIONARIES = { en, ar };

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/**
 * Destination names in one language at a time.
 *
 * Showing "AlUla العُلا" side by side reads as a translation exercise rather
 * than a product, so each locale gets its own name and nothing else.
 */
export const DESTINATIONS = [
  {
    key: "alula",
    name: { en: "AlUla", ar: "العُلا" },
    nights: 3,
    from: 2400,
  },
  {
    key: "abha",
    name: { en: "Abha", ar: "أبها" },
    nights: 4,
    from: 1980,
  },
  {
    key: "redsea",
    name: { en: "Red Sea", ar: "البحر الأحمر" },
    nights: 5,
    from: 6300,
  },
] as const;
