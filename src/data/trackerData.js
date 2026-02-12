export const pokerSessions = [
  { id: 'poker-1', date: '2026-02-08', startingBankroll: 1200, result: 440 },
  { id: 'poker-2', date: '2026-02-05', startingBankroll: 800, result: -180 },
  { id: 'poker-3', date: '2026-01-30', startingBankroll: 1500, result: 1250 },
  { id: 'poker-4', date: '2026-01-11', startingBankroll: 700, result: -95 },
  { id: 'poker-5', date: '2025-12-18', startingBankroll: 1400, result: 720 },
  { id: 'poker-6', date: '2025-11-29', startingBankroll: 1800, result: -430 }
];

export const hikingSessions = [
  { id: 'hike-1', date: '2026-02-09', location: 'Barton Creek', miles: 6.32, durationMinutes: 132 },
  { id: 'hike-2', date: '2026-02-04', location: 'River Loop', miles: 4.14, durationMinutes: 86 },
  { id: 'hike-3', date: '2026-01-28', location: 'Summit Ridge', miles: 8.21, durationMinutes: 171 },
  { id: 'hike-4', date: '2026-01-19', location: 'Canyon Pass', miles: 5.47, durationMinutes: 114 },
  { id: 'hike-5', date: '2025-12-30', location: 'River Loop', miles: 3.96, durationMinutes: 82 }
];

export const workouts = [
  { date: '2026-02-09', type: 'Strength', duration: 58, calories: 530, pr: 'Deadlift 405x3' },
  { date: '2026-02-07', type: 'Conditioning', duration: 36, calories: 420, pr: null },
  { date: '2026-02-05', type: 'Strength', duration: 54, calories: 500, pr: 'Bench 275x2' },
  { date: '2026-01-30', type: 'Mobility', duration: 33, calories: 210, pr: null },
  { date: '2026-01-22', type: 'Strength', duration: 62, calories: 560, pr: 'Squat 365x4' }
];

export const shoes = [
  { name: 'Jordan 1 High', brand: 'Nike', status: 'Owned', wearCount: 17 },
  { name: 'Yeezy 350', brand: 'Adidas', status: 'Owned', wearCount: 11 },
  { name: 'Gel Kayano 30', brand: 'Asics', status: 'Active', wearCount: 24 },
  { name: 'FuelCell Rebel', brand: 'New Balance', status: 'Wishlist', wearCount: 0 },
  { name: 'Chuck 70', brand: 'Converse', status: 'Owned', wearCount: 8 }
];

export const foodLogs = [
  { date: '2026-02-09', calories: 2280, protein: 175, quality: 'Strong', notes: 'Meal prep day.' },
  { date: '2026-02-08', calories: 2015, protein: 152, quality: 'Great', notes: 'Lean and clean.' },
  { date: '2026-02-07', calories: 2560, protein: 164, quality: 'Balanced', notes: 'Long hike day.' },
  { date: '2026-02-05', calories: 2390, protein: 160, quality: 'Balanced', notes: 'Higher carb intake.' },
  { date: '2026-01-28', calories: 2185, protein: 171, quality: 'Strong', notes: 'Solid macro split.' }
];

export const businessData = {
  income: [
    { date: '2026-02-01', amount: 12400 },
    { date: '2026-01-01', amount: 19800 },
    { date: '2025-12-01', amount: 17600 },
    { date: '2025-11-01', amount: 13300 }
  ],
  projects: [
    { name: 'Brand Reel', status: 'Queued', value: 3200 },
    { name: 'Podcast Edit Batch', status: 'Available', value: 1800 },
    { name: 'Launch Film', status: 'Upcoming', value: 7600 },
    { name: 'Ad Sequence', status: 'In Progress', value: 5200 }
  ],
  leads: [
    { client: 'Summit Fitness', stage: 'Warm', potential: 2400 },
    { client: 'Ridge Media', stage: 'Hot', potential: 6800 },
    { client: 'Southline Apparel', stage: 'Cold', potential: 1500 }
  ]
};
