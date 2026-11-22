// Chart colours shared by every page.
// Okabe-Ito colours: people with colour-blindness can still tell them apart.
// The names say which family each colour belongs to (same meaning as the status badges).
export const CHART_COLORS = {
  blue: '#0072b2', // units (kWh)
  rose: '#d55e00', // vermilion: billed amounts, overdue
  emerald: '#009e73', // paid, collected
  violet: '#cc79a7', // reddish purple: other series
  amber: '#e69f00', // unpaid, pending
  sky: '#56b4e9', // partially paid
  sand: '#5c5348', // totals and "other"
};

// The light colours get a darker edge, so every bar and slice stands out from the white card
export const CHART_EDGES = {
  [CHART_COLORS.amber]: '#b45309',
  [CHART_COLORS.sky]: '#0369a1',
};
