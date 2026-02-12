export const coreWidgets = [
  {
    id: 'poker',
    type: 'poker',
    title: 'Poker Winnings/Losses',
    description: 'Track sessions, swings, and long-term profitability.',
    accent: 'from-cyan-400/35 to-cyan-700/10'
  },
  {
    id: 'hiking',
    type: 'hiking',
    title: 'Mileage Hiked',
    description: 'Monitor distance progress by period and totals.',
    accent: 'from-emerald-300/35 to-emerald-700/10'
  },
  {
    id: 'workouts',
    type: 'workouts',
    title: 'Workouts + PRs',
    description: 'Filter by training type and monitor personal records.',
    accent: 'from-orange-300/35 to-orange-700/10'
  },
  {
    id: 'shoes',
    type: 'shoes',
    title: 'Shoe Collection',
    description: 'Filter by brand and collection status.',
    accent: 'from-indigo-300/35 to-indigo-700/10'
  },
  {
    id: 'calories',
    type: 'calories',
    title: 'Calories + Food',
    description: 'Track intake quality and calorie averages.',
    accent: 'from-fuchsia-300/35 to-fuchsia-700/10'
  },
  {
    id: 'business',
    type: 'business',
    title: 'Be Awesome Productions',
    description: 'Income, project pipeline, and lead status at a glance.',
    accent: 'from-sky-300/35 to-sky-700/10'
  }
];

export const createCustomWidget = (name, description) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    id: `custom-${slug || 'widget'}-${Date.now()}`,
    type: 'custom',
    title: name,
    description: description || 'Custom tracker module.',
    accent: 'from-amber-300/35 to-amber-700/10'
  };
};
