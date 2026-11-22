// Part of the day for a clock hour (0 to 23).
// icon = name of the small picture next to the greeting (components/common/Icon.jsx).
// Used by the top bar greeting and the day/night dashboard banner, so both always agree.
//   5:00 AM - 11:59 AM  morning
//  12:00 PM -  4:59 PM  afternoon
//   5:00 PM -  8:59 PM  evening
//   9:00 PM -  4:59 AM  night
export function dayPartFor(hour) {
  if (hour >= 5 && hour < 12) return { key: 'morning', greeting: 'Good morning', icon: 'sun' };
  if (hour >= 12 && hour < 17) return { key: 'afternoon', greeting: 'Good afternoon', icon: 'sun' };
  if (hour >= 17 && hour < 21) return { key: 'evening', greeting: 'Good evening', icon: 'sun' };
  return { key: 'night', greeting: 'Good night', icon: 'moon' };
}
