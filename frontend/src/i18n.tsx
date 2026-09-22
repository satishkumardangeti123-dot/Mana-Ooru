// i18n strings + LanguageProvider for Mana Ooru (English + Telugu)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lang = "en" | "te";

const STORAGE_KEY = "@manaooru:lang";

type Dict = Record<string, { en: string; te: string }>;

export const dict: Dict = {
  appName: { en: "Mana Ooru", te: "మన ఊరు" },
  tagline: { en: "Your village. Everything you need.", te: "మీ ఊరు. మీకు కావలసినవన్నీ." },
  continue: { en: "Continue", te: "కొనసాగించు" },
  getStarted: { en: "Get Started", te: "ప్రారంభించండి" },
  next: { en: "Next", te: "తర్వాత" },
  skip: { en: "Skip", te: "వదిలేయి" },
  done: { en: "Done", te: "పూర్తయింది" },
  chooseLanguage: { en: "Choose your language", te: "మీ భాషను ఎంచుకోండి" },
  english: { en: "English", te: "ఇంగ్లీష్" },
  telugu: { en: "Telugu", te: "తెలుగు" },
  chooseLocation: { en: "Choose your location", te: "మీ ప్రాంతాన్ని ఎంచుకోండి" },
  chooseLocationSubtitle: { en: "Select the village or town you live in.", te: "మీరు నివసించే గ్రామం లేదా పట్టణాన్ని ఎంచుకోండి." },
  interestsTitle: { en: "What do you want to see?", te: "మీకు ఏమి చూడాలనుకుంటున్నారు?" },
  interestsSubtitle: { en: "Pick what matters to you. You can change this later.", te: "మీకు అవసరమైనవి ఎంచుకోండి. తర్వాత మార్చవచ్చు." },
  welcomeTitle: { en: "Welcome to Mana Ooru", te: "మన ఊరుకు స్వాగతం" },
  welcomeSubtitle: { en: "Everything your village has to offer, in one place.", te: "మీ ఊరిలోని ప్రతిదీ ఒకే చోట." },

  // Home
  whatDoYouNeed: { en: "What do you need?", te: "మీకు ఏమి కావాలి?" },
  searchHint1: { en: "Find a pharmacy", te: "ఔషధశాల కనుగొను" },
  searchHint2: { en: "Find an electrician", te: "ఎలక్ట్రీషియన్ కనుగొను" },
  searchHint3: { en: "Bus to Kakinada?", te: "కాకినాడకు బస్?" },
  searchHint4: { en: "Hospital near me", te: "నా దగ్గర ఆసుపత్రి" },
  searchHint5: { en: "Government services", te: "ప్రభుత్వ సేవలు" },
  quickActions: { en: "Quick actions", te: "త్వరిత చర్యలు" },
  seeAll: { en: "See all", te: "అన్నీ చూడండి" },
  latestUpdates: { en: "Latest updates", te: "తాజా వార్తలు" },

  // Sections
  emergency: { en: "Emergency", te: "అత్యవసరం" },
  health: { en: "Health", te: "ఆరోగ్యం" },
  transport: { en: "Transport", te: "రవాణా" },
  services: { en: "Services", te: "సేవలు" },
  shops: { en: "Shops", te: "దుకాణాలు" },
  government: { en: "Government", te: "ప్రభుత్వం" },
  agriculture: { en: "Agriculture", te: "వ్యవసాయం" },
  updates: { en: "Updates", te: "వార్తలు" },
  more: { en: "More", te: "ఇంకా" },
  home: { en: "Home", te: "హోమ్" },
  settings: { en: "Settings", te: "సెట్టింగ్‌లు" },

  // Emergency
  emergencyHeader: { en: "Emergency Help", te: "అత్యవసర సహాయం" },
  callEmergency: { en: "CALL EMERGENCY SERVICES", te: "అత్యవసర సేవలకు కాల్ చేయండి" },
  emergencyDisclaimer: {
    en: "Mana Ooru does not replace official emergency services. In a life-threatening situation, call 112.",
    te: "మన ఊరు అధికారిక అత్యవసర సేవలను భర్తీ చేయదు. ప్రాణాపాయ సందర్భంలో 112కి కాల్ చేయండి.",
  },
  ambulance: { en: "Ambulance", te: "అంబులెన్స్" },
  police: { en: "Police", te: "పోలీసు" },
  fire: { en: "Fire", te: "అగ్నిమాపక" },
  hospitals: { en: "Hospitals", te: "ఆసుపత్రులు" },
  pharmacy: { en: "Pharmacy", te: "ఔషధశాల" },
  blood: { en: "Blood Help", te: "రక్త సహాయం" },

  // Health categories
  all: { en: "All", te: "అన్నీ" },
  hospital: { en: "Hospitals", te: "ఆసుపత్రులు" },
  doctor: { en: "Doctors", te: "వైద్యులు" },
  pharmacyCat: { en: "Pharmacies", te: "ఔషధశాలలు" },
  ambulanceCat: { en: "Ambulance", te: "అంబులెన్స్" },
  lab: { en: "Labs", te: "ల్యాబ్‌లు" },
  dental: { en: "Dental", te: "దంత" },
  eye: { en: "Eye Care", te: "కంటి" },
  healthNearYou: { en: "Health near you", te: "మీ దగ్గర ఆరోగ్యం" },

  // Business card
  open: { en: "Open", te: "తెరిచి ఉంది" },
  closed: { en: "Closed", te: "మూసివేయబడింది" },
  call: { en: "Call", te: "కాల్" },
  directions: { en: "Directions", te: "దిశలు" },
  km: { en: "km", te: "కి.మీ" },
  noResults: { en: "No results found", te: "ఫలితాలు లేవు" },
  clearFilters: { en: "Clear filters", te: "ఫిల్టర్‌లు క్లియర్ చేయి" },
  loading: { en: "Loading…", te: "లోడ్ అవుతోంది…" },
  retry: { en: "Retry", te: "మళ్లీ ప్రయత్నించండి" },

  // Section stub
  comingSoon: { en: "More coming soon", te: "త్వరలో మరిన్ని" },

  // Settings
  language: { en: "Language", te: "భాష" },
  location: { en: "Location", te: "ప్రాంతం" },
  aboutApp: { en: "About Mana Ooru", te: "మన ఊరు గురించి" },
  aboutBody: {
    en: "Mana Ooru brings the most useful local information and services of your village into one simple app. It is free to use.",
    te: "మన ఊరు మీ గ్రామంలోని అత్యంత ఉపయోగకరమైన సమాచారం మరియు సేవలను ఒకే యాప్‌లోకి తీసుకువస్తుంది. ఇది ఉచితం.",
  },

  // Auth
  signIn: { en: "Sign in with Google", te: "గూగుల్‌తో సైన్ ఇన్ చేయండి" },
  signOut: { en: "Sign out", te: "సైన్ అవుట్" },
  signedInAs: { en: "Signed in as", te: "సైన్ ఇన్ అయ్యారు" },
  saveFavourites: { en: "Sign in to save favourites and get alerts", te: "ఇష్టమైనవి సేవ్ చేసుకోవడానికి & అలర్ట్‌ల కోసం సైన్ ఇన్ చేయండి" },
  favourites: { en: "Favourites", te: "ఇష్టమైనవి" },
  favouriteAdded: { en: "Added to favourites", te: "ఇష్టమైనవాటికి జోడించబడింది" },
  favouriteRemoved: { en: "Removed from favourites", te: "ఇష్టమైనవి నుండి తీసివేయబడింది" },

  // Push
  villageAlerts: { en: "Village Alerts", te: "గ్రామ అలర్ట్‌లు" },
  villageAlertsHint: { en: "Get panchayat, health-camp and water-supply updates", te: "పంచాయతీ, ఆరోగ్య శిబిరం & నీటి సరఫరా అప్‌డేట్‌లు పొందండి" },

  // Voice
  voiceSearch: { en: "Voice search", te: "వాయిస్ శోధన" },
  listening: { en: "Listening…", te: "వింటున్నాను…" },
  tapToSpeak: { en: "Tap the mic and speak", te: "మైక్ నొక్కి మాట్లాడండి" },
  microphoneNeeded: { en: "Microphone needed", te: "మైక్రోఫోన్ అవసరం" },
  microphoneNeededBody: { en: "Please allow microphone access to use voice search.", te: "వాయిస్ శోధన కోసం మైక్రోఫోన్ యాక్సెస్ ఇవ్వండి." },
  openSettings: { en: "Open settings", te: "సెట్టింగ్‌లు తెరవండి" },
  cancel: { en: "Cancel", te: "రద్దు" },

  // Buses
  nextBuses: { en: "Next buses from Patavala", te: "పటవల నుండి తదుపరి బస్సులు" },
  in: { en: "in", te: "" },
  min: { en: "min", te: "నిమి" },
  to: { en: "To", te: "వైపు" },

  // Feed
  feed: { en: "Village feed", te: "గ్రామ ఫీడ్" },
  newPost: { en: "New post", te: "కొత్త పోస్ట్" },
  postTitle: { en: "Give it a short title", te: "చిన్న శీర్షిక ఇవ్వండి" },
  postBody: { en: "What is happening in the village?", te: "మీ ఊరిలో ఏమి జరుగుతోంది?" },
  addPhoto: { en: "Add photo", te: "ఫోటో జోడించండి" },
  changePhoto: { en: "Change photo", te: "ఫోటో మార్చండి" },
  removePhoto: { en: "Remove photo", te: "ఫోటో తీసివేయండి" },
  publish: { en: "Publish", te: "ప్రచురించండి" },
  publishing: { en: "Publishing…", te: "ప్రచురిస్తోంది…" },
  signInToPost: { en: "Sign in to post to the feed", te: "ఫీడ్‌లో పోస్ట్ చేయడానికి సైన్ ఇన్ చేయండి" },
  reportPost: { en: "Report", te: "నివేదించండి" },
  reportedThanks: { en: "Thanks — our team will review", te: "ధన్యవాదాలు — మా బృందం సమీక్షిస్తుంది" },
  emptyFeed: { en: "No posts yet — be the first to share!", te: "ఇంకా పోస్ట్‌లు లేవు — మొదటిగా షేర్ చేయండి!" },
  officialUpdate: { en: "Official update", te: "అధికారిక ప్రకటన" },

  // Employee
  employeeLogin: { en: "Business owner? Sign in", te: "వ్యాపార యజమాని? సైన్ ఇన్ చేయండి" },
  employeeLoginTitle: { en: "Update your shop details", te: "మీ దుకాణ వివరాలను నవీకరించండి" },
  employeeLoginHint: { en: "Enter your Mana Ooru edit code to update your business timings and details.", te: "మీ వ్యాపార సమయాలు & వివరాలు నవీకరించడానికి మన ఊరు ఎడిట్ కోడ్‌ను నమోదు చేయండి." },
  businessId: { en: "Business ID", te: "వ్యాపార ID" },
  editCode: { en: "Edit code", te: "ఎడిట్ కోడ్" },
  invalidCode: { en: "Invalid ID or code", te: "చెల్లని ID లేదా కోడ్" },
  signInAsShop: { en: "Sign in", te: "సైన్ ఇన్" },
  editingShop: { en: "Editing", te: "సవరిస్తున్నారు" },
  saveChanges: { en: "Save changes", te: "మార్పులను సేవ్ చేయండి" },
  savedChanges: { en: "Saved!", te: "సేవ్ అయ్యింది!" },
  isOpenNow: { en: "Currently open", te: "ప్రస్తుతం తెరిచి ఉంది" },
  hoursLabel: { en: "Hours", te: "సమయాలు" },
  phoneLabel: { en: "Phone", te: "ఫోన్" },
  addressLabel: { en: "Address", te: "చిరునామా" },
  logoutEditor: { en: "Log out", te: "లాగ్ అవుట్" },

  // Verified & photo picker & admin
  verified: { en: "Verified", te: "ధృవీకరించబడింది" },
  takePhoto: { en: "Take photo", te: "ఫోటో తీయండి" },
  fromGallery: { en: "From gallery", te: "గ్యాలరీ నుండి" },
  chooseSource: { en: "Choose a photo source", te: "ఫోటో మూలాన్ని ఎంచుకోండి" },
  admin: { en: "Admin", te: "అడ్మిన్" },
  adminConsole: { en: "Admin console", te: "అడ్మిన్ కన్సోల్" },
  adminConsoleHint: { en: "Review reports, broadcast alerts, view shop codes", te: "నివేదికలు, ప్రసారాలు, దుకాణ కోడ్‌లు" },
  reports: { en: "Reports", te: "నివేదికలు" },
  reportsHint: { en: "Reported posts", te: "నివేదించబడిన పోస్ట్‌లు" },
  broadcast: { en: "Broadcast", te: "ప్రసారం" },
  broadcastHint: { en: "Send a village-wide alert", te: "గ్రామం మొత్తం అలర్ట్ పంపండి" },
  shopCodes: { en: "Shop codes", te: "దుకాణ కోడ్‌లు" },
  shopCodesHint: { en: "Look up business edit codes", te: "వ్యాపార ఎడిట్ కోడ్‌లను చూడండి" },
  send: { en: "Send", te: "పంపు" },
  sent: { en: "Sent to devices", te: "పరికరాలకు పంపబడింది" },
  broadcastTitle: { en: "Alert title", te: "అలర్ట్ శీర్షిక" },
  broadcastMessage: { en: "Message", te: "సందేశం" },
  broadcastTag: { en: "Tag (optional)", te: "ట్యాగ్ (ఐచ్ఛికం)" },
  hidden: { en: "Hidden", te: "దాచబడింది" },
  hide: { en: "Hide", te: "దాచు" },
  restore: { en: "Restore", te: "పునరుద్ధరించండి" },
  deletePost: { en: "Delete", te: "తొలగించండి" },
  copy: { en: "Copy", te: "కాపీ" },
  copied: { en: "Copied", te: "కాపీ చేయబడింది" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string; ready: boolean };
const LanguageContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict[k]?.en ?? String(k),
  ready: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "te") setLangState(stored);
      } catch {}
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback((k: keyof typeof dict) => dict[k]?.[lang] ?? dict[k]?.en ?? String(k), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
