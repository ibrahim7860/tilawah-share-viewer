// Quran navigation data + helpers, ported verbatim from the app's
// src/constants/quranData.js so the viewer's surah/juz/page mapping is
// byte-for-byte identical to the in-app Quran tab (15-line Madani Mushaf).

export const TOTAL_PAGES = 604

export const JUZ_LIST = [
  { number: 1, name: 'الم' },
  { number: 2, name: 'سيقول' },
  { number: 3, name: 'تلك الرسل' },
  { number: 4, name: 'لن تنالوا' },
  { number: 5, name: 'والمحصنات' },
  { number: 6, name: 'لا يحب الله' },
  { number: 7, name: 'واذا سمعوا' },
  { number: 8, name: 'ولو انا' },
  { number: 9, name: 'قال الم' },
  { number: 10, name: 'واعلموا' },
  { number: 11, name: 'يعتذرون' },
  { number: 12, name: 'وما من دابة' },
  { number: 13, name: 'وما ابرئ' },
  { number: 14, name: 'ربما' },
  { number: 15, name: 'سبحان الذي' },
  { number: 16, name: 'قال الم' },
  { number: 17, name: 'اقترب للناس' },
  { number: 18, name: 'قد افلح' },
  { number: 19, name: 'وقال الذين' },
  { number: 20, name: 'امن خلق' },
  { number: 21, name: 'اتل ما اوحي' },
  { number: 22, name: 'ومن يقنت' },
  { number: 23, name: 'وما لي' },
  { number: 24, name: 'فمن اظلم' },
  { number: 25, name: 'اليه يرد' },
  { number: 26, name: 'حم' },
  { number: 27, name: 'قال فما خطبكم' },
  { number: 28, name: 'قد سمع الله' },
  { number: 29, name: 'تبارك الذي' },
  { number: 30, name: 'عم' },
]

export const SURAH_LIST = [
  { number: 1, name: 'الفاتحة', firstPage: 1, ayahCount: 7 },
  { number: 2, name: 'البقرة', firstPage: 2, ayahCount: 286 },
  { number: 3, name: 'آل عمران', firstPage: 50, ayahCount: 200 },
  { number: 4, name: 'النساء', firstPage: 77, ayahCount: 176 },
  { number: 5, name: 'المائدة', firstPage: 106, ayahCount: 120 },
  { number: 6, name: 'الأنعام', firstPage: 128, ayahCount: 165 },
  { number: 7, name: 'الأعراف', firstPage: 151, ayahCount: 206 },
  { number: 8, name: 'الأنفال', firstPage: 177, ayahCount: 75 },
  { number: 9, name: 'التوبة', firstPage: 187, ayahCount: 129 },
  { number: 10, name: 'يونس', firstPage: 208, ayahCount: 109 },
  { number: 11, name: 'هود', firstPage: 221, ayahCount: 123 },
  { number: 12, name: 'يوسف', firstPage: 235, ayahCount: 111 },
  { number: 13, name: 'الرعد', firstPage: 249, ayahCount: 43 },
  { number: 14, name: 'إبراهيم', firstPage: 255, ayahCount: 52 },
  { number: 15, name: 'الحجر', firstPage: 262, ayahCount: 99 },
  { number: 16, name: 'النحل', firstPage: 267, ayahCount: 128 },
  { number: 17, name: 'الإسراء', firstPage: 282, ayahCount: 111 },
  { number: 18, name: 'الكهف', firstPage: 293, ayahCount: 110 },
  { number: 19, name: 'مريم', firstPage: 305, ayahCount: 98 },
  { number: 20, name: 'طه', firstPage: 312, ayahCount: 135 },
  { number: 21, name: 'الأنبياء', firstPage: 322, ayahCount: 112 },
  { number: 22, name: 'الحج', firstPage: 332, ayahCount: 78 },
  { number: 23, name: 'المؤمنون', firstPage: 342, ayahCount: 118 },
  { number: 24, name: 'النور', firstPage: 350, ayahCount: 64 },
  { number: 25, name: 'الفرقان', firstPage: 359, ayahCount: 77 },
  { number: 26, name: 'الشعراء', firstPage: 367, ayahCount: 227 },
  { number: 27, name: 'النمل', firstPage: 377, ayahCount: 93 },
  { number: 28, name: 'القصص', firstPage: 385, ayahCount: 88 },
  { number: 29, name: 'العنكبوت', firstPage: 396, ayahCount: 69 },
  { number: 30, name: 'الروم', firstPage: 404, ayahCount: 60 },
  { number: 31, name: 'لقمان', firstPage: 411, ayahCount: 34 },
  { number: 32, name: 'السجدة', firstPage: 415, ayahCount: 30 },
  { number: 33, name: 'الأحزاب', firstPage: 418, ayahCount: 73 },
  { number: 34, name: 'سبأ', firstPage: 428, ayahCount: 54 },
  { number: 35, name: 'فاطر', firstPage: 434, ayahCount: 45 },
  { number: 36, name: 'يس', firstPage: 440, ayahCount: 83 },
  { number: 37, name: 'الصافات', firstPage: 446, ayahCount: 182 },
  { number: 38, name: 'ص', firstPage: 453, ayahCount: 88 },
  { number: 39, name: 'الزمر', firstPage: 458, ayahCount: 75 },
  { number: 40, name: 'غافر', firstPage: 467, ayahCount: 85 },
  { number: 41, name: 'فصلت', firstPage: 477, ayahCount: 54 },
  { number: 42, name: 'الشورى', firstPage: 483, ayahCount: 53 },
  { number: 43, name: 'الزخرف', firstPage: 489, ayahCount: 89 },
  { number: 44, name: 'الدخان', firstPage: 496, ayahCount: 59 },
  { number: 45, name: 'الجاثية', firstPage: 499, ayahCount: 37 },
  { number: 46, name: 'الأحقاف', firstPage: 502, ayahCount: 35 },
  { number: 47, name: 'محمد', firstPage: 507, ayahCount: 38 },
  { number: 48, name: 'الفتح', firstPage: 511, ayahCount: 29 },
  { number: 49, name: 'الحجرات', firstPage: 515, ayahCount: 18 },
  { number: 50, name: 'ق', firstPage: 518, ayahCount: 45 },
  { number: 51, name: 'الذاريات', firstPage: 520, ayahCount: 60 },
  { number: 52, name: 'الطور', firstPage: 523, ayahCount: 49 },
  { number: 53, name: 'النجم', firstPage: 526, ayahCount: 62 },
  { number: 54, name: 'القمر', firstPage: 528, ayahCount: 55 },
  { number: 55, name: 'الرحمن', firstPage: 531, ayahCount: 78 },
  { number: 56, name: 'الواقعة', firstPage: 534, ayahCount: 96 },
  { number: 57, name: 'الحديد', firstPage: 537, ayahCount: 29 },
  { number: 58, name: 'المجادلة', firstPage: 542, ayahCount: 22 },
  { number: 59, name: 'الحشر', firstPage: 545, ayahCount: 24 },
  { number: 60, name: 'الممتحنة', firstPage: 549, ayahCount: 13 },
  { number: 61, name: 'الصف', firstPage: 551, ayahCount: 14 },
  { number: 62, name: 'الجمعة', firstPage: 553, ayahCount: 11 },
  { number: 63, name: 'المنافقون', firstPage: 554, ayahCount: 11 },
  { number: 64, name: 'التغابن', firstPage: 556, ayahCount: 18 },
  { number: 65, name: 'الطلاق', firstPage: 558, ayahCount: 12 },
  { number: 66, name: 'التحريم', firstPage: 560, ayahCount: 12 },
  { number: 67, name: 'الملك', firstPage: 562, ayahCount: 30 },
  { number: 68, name: 'القلم', firstPage: 564, ayahCount: 52 },
  { number: 69, name: 'الحاقة', firstPage: 566, ayahCount: 52 },
  { number: 70, name: 'المعارج', firstPage: 568, ayahCount: 44 },
  { number: 71, name: 'نوح', firstPage: 570, ayahCount: 28 },
  { number: 72, name: 'الجن', firstPage: 572, ayahCount: 28 },
  { number: 73, name: 'المزمل', firstPage: 574, ayahCount: 20 },
  { number: 74, name: 'المدثر', firstPage: 575, ayahCount: 56 },
  { number: 75, name: 'القيامة', firstPage: 577, ayahCount: 40 },
  { number: 76, name: 'الإنسان', firstPage: 578, ayahCount: 31 },
  { number: 77, name: 'المرسلات', firstPage: 580, ayahCount: 50 },
  { number: 78, name: 'النبأ', firstPage: 582, ayahCount: 40 },
  { number: 79, name: 'النازعات', firstPage: 583, ayahCount: 46 },
  { number: 80, name: 'عبس', firstPage: 585, ayahCount: 42 },
  { number: 81, name: 'التكوير', firstPage: 586, ayahCount: 29 },
  { number: 82, name: 'الانفطار', firstPage: 587, ayahCount: 19 },
  { number: 83, name: 'المطففين', firstPage: 587, ayahCount: 36 },
  { number: 84, name: 'الانشقاق', firstPage: 589, ayahCount: 25 },
  { number: 85, name: 'البروج', firstPage: 590, ayahCount: 22 },
  { number: 86, name: 'الطارق', firstPage: 591, ayahCount: 17 },
  { number: 87, name: 'الأعلى', firstPage: 591, ayahCount: 19 },
  { number: 88, name: 'الغاشية', firstPage: 592, ayahCount: 26 },
  { number: 89, name: 'الفجر', firstPage: 593, ayahCount: 30 },
  { number: 90, name: 'البلد', firstPage: 594, ayahCount: 20 },
  { number: 91, name: 'الشمس', firstPage: 595, ayahCount: 15 },
  { number: 92, name: 'الليل', firstPage: 595, ayahCount: 21 },
  { number: 93, name: 'الضحى', firstPage: 596, ayahCount: 11 },
  { number: 94, name: 'الشرح', firstPage: 596, ayahCount: 8 },
  { number: 95, name: 'التين', firstPage: 597, ayahCount: 8 },
  { number: 96, name: 'العلق', firstPage: 597, ayahCount: 19 },
  { number: 97, name: 'القدر', firstPage: 598, ayahCount: 5 },
  { number: 98, name: 'البينة', firstPage: 598, ayahCount: 8 },
  { number: 99, name: 'الزلزلة', firstPage: 599, ayahCount: 8 },
  { number: 100, name: 'العاديات', firstPage: 599, ayahCount: 11 },
  { number: 101, name: 'القارعة', firstPage: 600, ayahCount: 11 },
  { number: 102, name: 'التكاثر', firstPage: 600, ayahCount: 8 },
  { number: 103, name: 'العصر', firstPage: 601, ayahCount: 3 },
  { number: 104, name: 'الهمزة', firstPage: 601, ayahCount: 9 },
  { number: 105, name: 'الفيل', firstPage: 601, ayahCount: 5 },
  { number: 106, name: 'قريش', firstPage: 602, ayahCount: 4 },
  { number: 107, name: 'الماعون', firstPage: 602, ayahCount: 7 },
  { number: 108, name: 'الكوثر', firstPage: 602, ayahCount: 3 },
  { number: 109, name: 'الكافرون', firstPage: 603, ayahCount: 6 },
  { number: 110, name: 'النصر', firstPage: 603, ayahCount: 3 },
  { number: 111, name: 'المسد', firstPage: 603, ayahCount: 5 },
  { number: 112, name: 'الإخلاص', firstPage: 604, ayahCount: 4 },
  { number: 113, name: 'الفلق', firstPage: 604, ayahCount: 5 },
  { number: 114, name: 'الناس', firstPage: 604, ayahCount: 6 },
]

export const JUZ_TO_PAGE_MAP = {
  1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
  11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
  21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582,
}

/** Clamp any value to a valid page number in [1, 604]. */
export function clampPage(n) {
  const x = Math.floor(Number(n))
  if (!Number.isFinite(x)) return 1
  return Math.min(TOTAL_PAGES, Math.max(1, x))
}

/** First page of a surah (1–114), or null if out of range. */
export function surahStartPage(number) {
  const s = SURAH_LIST.find((x) => x.number === number)
  return s ? s.firstPage : null
}

/** First page of a juz (1–30), or null if out of range. */
export function juzStartPage(number) {
  return JUZ_TO_PAGE_MAP[number] || null
}

/**
 * Parse free-form "jump to page" input into a valid page number, or null if it
 * isn't a number at all. Numeric-but-out-of-range values are clamped, matching
 * the app's bounds (1–604).
 */
export function parseJumpPage(input) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) return null
  return clampPage(parseInt(trimmed, 10))
}

/** The surah a given page belongs to (the last surah whose firstPage ≤ page). */
export function surahForPage(pageNumber) {
  let result = SURAH_LIST[0]
  for (const s of SURAH_LIST) {
    if (s.firstPage <= pageNumber) result = s
    else break
  }
  return result
}
