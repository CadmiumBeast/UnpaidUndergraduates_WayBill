import { useUi } from '@/store/ui'

export type Language = 'en' | 'si' | 'ta'

export const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' }

const COPY: Record<Language, Record<string, string>> = {
  en: {
    'login.title': 'Sign in', 'login.subtitle': 'Use your staff ID and 4-digit PIN.', 'login.staffId': 'Staff ID', 'login.pin': 'PIN',
    'login.remember': 'Remember this device (drivers on their own phone)', 'login.signIn': 'Sign in',
    'login.forgot': 'Forgot your PIN? Ask your dispatcher to reset it.', 'login.demo': 'Demo accounts (PIN 1234)',
    'login.offline': 'No signal. You can still sign in if you have signed in on this device before.',
    'role.dispatcher': 'Dispatcher', 'role.loader': 'Loader', 'role.driver': 'Driver', 'role.manager': 'Store manager',
    'nav.today': 'Today', 'nav.orders': 'Order queue', 'nav.planning': 'Planning board', 'nav.deferrals': 'Deferrals',
    'nav.runs': 'Live runs', 'nav.fleet': 'Fleet and fuel', 'nav.endOfDay': 'End of day', 'nav.outlook': 'Capacity outlook',
    'nav.team': 'Users and roles', 'nav.activity': 'Activity log', 'nav.vehicles': 'Vehicles', 'nav.alerts': 'Alerts',
    'nav.trips': 'Trips', 'nav.sync': 'Sync', 'nav.notifications': 'Notifications', 'language.label': 'Language',
  },
  si: {
    'login.title': 'පිවිසෙන්න', 'login.subtitle': 'ඔබේ කාර්ය මණ්ඩල අංකය සහ ඉලක්කම් 4ක PIN එක භාවිත කරන්න.', 'login.staffId': 'කාර්ය මණ්ඩල අංකය', 'login.pin': 'PIN',
    'login.remember': 'මෙම උපාංගය මතක තබාගන්න (රියදුරන්ගේ දුරකථනය සඳහා)', 'login.signIn': 'පිවිසෙන්න',
    'login.forgot': 'PIN අමතකද? නැවත සකස් කිරීමට dispatcher අමතන්න.', 'login.demo': 'ආදර්ශ ගිණුම් (PIN 1234)',
    'login.offline': 'සම්බන්ධතාවයක් නැත. මෙම උපාංගයෙන් කලින් පිවිසී ඇත්නම් තවමත් පිවිසිය හැක.',
    'role.dispatcher': 'බෙදාහැරීම් සැලසුම්කරු', 'role.loader': 'පැටවීම් නිලධාරී', 'role.driver': 'රියදුරු', 'role.manager': 'ගබඩා කළමනාකරු',
    'nav.today': 'අද', 'nav.orders': 'ඇණවුම් පෝලිම', 'nav.planning': 'සැලසුම් පුවරුව', 'nav.deferrals': 'කල්දැමීම්',
    'nav.runs': 'ධාවනය වන ගමන්', 'nav.fleet': 'වාහන සහ ඉන්ධන', 'nav.endOfDay': 'දවස අවසානය', 'nav.outlook': 'ධාරිතා දැක්ම',
    'nav.team': 'පරිශීලකයන් සහ භූමිකා', 'nav.activity': 'ක්‍රියාකාරකම් ලොගය', 'nav.vehicles': 'වාහන', 'nav.alerts': 'දැනුම්දීම්',
    'nav.trips': 'ගමන්', 'nav.sync': 'සමමුහුර්ත කිරීම', 'nav.notifications': 'දැනුම්දීම්', 'language.label': 'භාෂාව',
  },
  ta: {
    'login.title': 'உள்நுழைக', 'login.subtitle': 'உங்கள் பணியாளர் அடையாளத்தையும் 4 இலக்க PIN-ஐயும் பயன்படுத்தவும்.', 'login.staffId': 'பணியாளர் அடையாளம்', 'login.pin': 'PIN',
    'login.remember': 'இந்த சாதனத்தை நினைவில் கொள்ளவும் (ஓட்டுநரின் தொலைபேசிக்கு)', 'login.signIn': 'உள்நுழைக',
    'login.forgot': 'PIN மறந்துவிட்டீர்களா? மீட்டமைக்க dispatcher-ஐ தொடர்புகொள்ளவும்.', 'login.demo': 'சோதனை கணக்குகள் (PIN 1234)',
    'login.offline': 'இணைப்பு இல்லை. இந்த சாதனத்தில் முன்பு உள்நுழைந்திருந்தால் தொடர்ந்து உள்நுழையலாம்.',
    'role.dispatcher': 'விநியோக திட்டமிடுபவர்', 'role.loader': 'ஏற்றுநர்', 'role.driver': 'ஓட்டுநர்', 'role.manager': 'கடை மேலாளர்',
    'nav.today': 'இன்று', 'nav.orders': 'ஆர்டர் வரிசை', 'nav.planning': 'திட்டமிடல் பலகை', 'nav.deferrals': 'ஒத்திவைப்புகள்',
    'nav.runs': 'நடப்பு பயணங்கள்', 'nav.fleet': 'வாகனங்கள் மற்றும் எரிபொருள்', 'nav.endOfDay': 'நாள் முடிவு', 'nav.outlook': 'திறன் பார்வை',
    'nav.team': 'பயனர்கள் மற்றும் பங்குகள்', 'nav.activity': 'செயல்பாட்டு பதிவு', 'nav.vehicles': 'வாகனங்கள்', 'nav.alerts': 'எச்சரிக்கைகள்',
    'nav.trips': 'பயணங்கள்', 'nav.sync': 'ஒத்திசைவு', 'nav.notifications': 'அறிவிப்புகள்', 'language.label': 'மொழி',
  },
}

export function translate(language: Language, key: string): string { return COPY[language][key] ?? COPY.en[key] ?? key }
export function useLanguage(): Language { return useUi((s) => s.language) }
