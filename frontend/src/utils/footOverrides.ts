// Manual preferred-foot corrections for players the source dataset left blank (346 players
// had no `foot` value, which let right-footed players leak into "Left" searches). Only
// well-documented players are filled in here — a wrong foot is worse than a blank one.
// Applied in ScoutLab's enrichCurrent, so it drives both the foot filter and the report.
// Values are lowercase to match the dataset's existing 'left' / 'right'.

export const footOverrides: Record<string, 'left' | 'right'> = {
  // Right-footed
  'vinicius junior': 'right',
  'gabriel martinelli': 'right',
  'bruno fernandes': 'right',
  'emiliano martinez': 'right',
  'julian alvarez': 'right',
  'pedro neto': 'right',
  'ismaila sarr': 'right',
  'kim min-jae': 'right',
  'andre-frank zambo anguissa': 'right',
  'idrissa gana gueye': 'right',
  'dodi lukebakio': 'right',
  'illia zabarnyi': 'right',
  'benjamin sesko': 'right',
  'daniel parejo': 'right',
  'nicolas paz': 'right',
  'valentin castellanos': 'right',
  'loic bade': 'right',
  'josko gvardiol': 'left',

  // Left-footed
  'theo hernandez': 'left',
  'alex grimaldo': 'left',
  'alessio romagnoli': 'left',
  'marcos alonso': 'left',
  'alex baena': 'left',
  'alvaro garcia': 'left',
  'moussa niakhate': 'left',
};

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function getFootOverride(name: string): 'left' | 'right' | undefined {
  if (!name) return undefined;
  const key = stripAccents(name.toLowerCase().trim());
  return footOverrides[key];
}
