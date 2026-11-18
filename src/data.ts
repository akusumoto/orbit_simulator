export const FACTS = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/';
export const PLUTO_FACTS = `${FACTS}plutofact.html`;
export const ORBIT_SOURCE = 'https://ssd.jpl.nasa.gov/planets/approx_pos.html';
export const TEXTURES = 'https://www.solarsystemscope.com/textures/';
export const EARTH_DAYS = 365.256;
export interface OrbitalElements {
  a: number;
  e: number;
  inclination: number;
  perihelionLongitude: number;
  ascendingNode: number;
}

// JPL Table 1 constants at J2000 (angles in degrees); Earth uses EM barycenter.
// Pluto: NSSDCA Pluto Mean Orbital Elements (J2000), from PLUTO_FACTS.
export const J2000_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: { a: 0.38709927, e: 0.20563593, inclination: 7.00497902, perihelionLongitude: 77.45779628, ascendingNode: 48.33076593 },
  venus: { a: 0.72333566, e: 0.00677672, inclination: 3.39467605, perihelionLongitude: 131.60246718, ascendingNode: 76.67984255 },
  earth: { a: 1.00000261, e: 0.01671123, inclination: -0.00001531, perihelionLongitude: 102.93768193, ascendingNode: 0 },
  mars: { a: 1.52371034, e: 0.09339410, inclination: 1.84969142, perihelionLongitude: -23.94362959, ascendingNode: 49.55953891 },
  jupiter: { a: 5.20288700, e: 0.04838624, inclination: 1.30439695, perihelionLongitude: 14.72847983, ascendingNode: 100.47390909 },
  saturn: { a: 9.53667594, e: 0.05386179, inclination: 2.48599187, perihelionLongitude: 92.59887831, ascendingNode: 113.66242448 },
  uranus: { a: 19.18916464, e: 0.04725744, inclination: 0.77263783, perihelionLongitude: 170.95427630, ascendingNode: 74.01692503 },
  neptune: { a: 30.06992276, e: 0.00859048, inclination: 1.77004347, perihelionLongitude: 44.96476227, ascendingNode: 131.78422574 },
  pluto: { a: 39.48168677, e: 0.24880766, inclination: 17.14175, perihelionLongitude: 224.06676, ascendingNode: 110.30347 },
};

export interface Planet {
  id: string;
  name: string;
  english: string;
  color: string;
  diameter: number;
  mass: number;
  rotationHours: number;
  periodDays: number;
  axisAU: number;
  size: number;
  description: string;
  ring?: 'saturn' | 'uranus';
}

// Metric Fact Sheet snapshot, 2026-11-18. Orbital lengths use J2000_ELEMENTS.
// Earth sidereal year: Pluto Fact Sheet Earth comparison.
export const planets: Planet[] = [
  { id: 'mercury', name: '水星', english: 'Mercury', color: '#B0BEC5', diameter: 4879, mass: 0.330e24, rotationHours: 1407.6, periodDays: 88, axisAU: J2000_ELEMENTS.mercury.a, size: 12, description: '太陽に最も近い、小さな岩石惑星。表面には数多くのクレーターが刻まれています。' },
  { id: 'venus', name: '金星', english: 'Venus', color: '#FFD54F', diameter: 12104, mass: 4.87e24, rotationHours: -5832.5, periodDays: 224.7, axisAU: J2000_ELEMENTS.venus.a, size: 16, description: '厚い雲に包まれた岩石惑星。ゆっくりと逆向きに自転し、自転の周期は公転周期よりも長くなります。' },
  { id: 'earth', name: '地球', english: 'Earth', color: '#42A5F5', diameter: 12756, mass: 5.97e24, rotationHours: 23.9345, periodDays: EARTH_DAYS, axisAU: J2000_ELEMENTS.earth.a, size: 18, description: '液体の海と大気を持つ、私たちの惑星。このシミュレーターでは地球の公転周期を1年としています。' },
  { id: 'mars', name: '火星', english: 'Mars', color: '#EF5350', diameter: 6792, mass: 0.642e24, rotationHours: 24.6, periodDays: 687, axisAU: J2000_ELEMENTS.mars.a, size: 14, description: '酸化鉄による赤い大地が特徴の岩石惑星。巨大な火山や峡谷が広がります。' },
  { id: 'jupiter', name: '木星', english: 'Jupiter', color: '#FFB74D', diameter: 142984, mass: 1898e24, rotationHours: 9.9, periodDays: 4331, axisAU: J2000_ELEMENTS.jupiter.a, size: 30, description: '太陽系最大の惑星。大気の縞模様と、長く続く巨大な嵐「大赤斑」が特徴です。' },
  { id: 'saturn', name: '土星', english: 'Saturn', color: '#DCE775', diameter: 120536, mass: 568e24, rotationHours: 10.7, periodDays: 10747, axisAU: J2000_ELEMENTS.saturn.a, size: 26, ring: 'saturn', description: '氷や岩石の粒からなる美しい環を持つ巨大惑星。淡い大気の縞模様も観察できます。' },
  { id: 'uranus', name: '天王星', english: 'Uranus', color: '#4DD0E1', diameter: 51118, mass: 86.8e24, rotationHours: -17.2, periodDays: 30589, axisAU: J2000_ELEMENTS.uranus.a, size: 22, ring: 'uranus', description: '青緑色の氷巨大惑星。自転軸が大きく傾き、細く暗い環を持っています。' },
  { id: 'neptune', name: '海王星', english: 'Neptune', color: '#7986CB', diameter: 49528, mass: 102e24, rotationHours: 16.1, periodDays: 59800, axisAU: J2000_ELEMENTS.neptune.a, size: 22, description: '8惑星のうち太陽から最も遠い氷巨大惑星。地球の約164年をかけて太陽を一周します。' },
  { id: 'pluto', name: '冥王星', english: 'Pluto', color: '#CE93D8', diameter: 2376, mass: 0.01303e24, rotationHours: -153.2928, periodDays: 90560, axisAU: 39.48168677, size: 12, description: '太陽系の外縁を巡る準惑星。ハート形の明るい地形を持ち、細長い楕円軌道を公転します。' },
];

export const PLUTO_ECCENTRICITY = J2000_ELEMENTS.pluto.e;
export const texturePath = (id: string) => `/textures/${id}.webp`;
export const periodYears = (p: Planet) => p.periodDays / EARTH_DAYS;
export const number = (value: number, digits = 2) => value.toLocaleString('ja-JP', { maximumFractionDigits: digits });
