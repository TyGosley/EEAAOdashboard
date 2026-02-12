const RANK_VALUES = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

const SUITS = ['s', 'h', 'd', 'c'];
const RANK_KEYS_DESC = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUIT_LABELS = {
  s: 'Spades',
  h: 'Hearts',
  d: 'Diamonds',
  c: 'Clubs'
};

export const CARD_OPTIONS = RANK_KEYS_DESC.flatMap((rank) =>
  SUITS.map((suit) => ({
    value: `${rank}${suit}`,
    label: `${rank}${suit.toUpperCase()} (${SUIT_LABELS[suit]})`
  }))
);

const scoreCompare = (left, right) => {
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const leftValue = left[i] ?? -1;
    const rightValue = right[i] ?? -1;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
};

const getStraightHigh = (ranks) => {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique.includes(14)) unique.unshift(1);

  let streak = 1;
  let high = null;

  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] === unique[i - 1] + 1) {
      streak += 1;
      if (streak >= 5) high = unique[i];
    } else if (unique[i] !== unique[i - 1]) {
      streak = 1;
    }
  }

  return high;
};

const evaluateFive = (cards) => {
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const suits = cards.map((card) => card.suit);
  const flush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHigh(ranks);

  const rankCountMap = new Map();
  ranks.forEach((rank) => {
    rankCountMap.set(rank, (rankCountMap.get(rank) ?? 0) + 1);
  });

  const rankGroups = [...rankCountMap.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (flush && straightHigh) return [8, straightHigh];

  if (rankGroups[0].count === 4) {
    const kicker = rankGroups.find((group) => group.count === 1)?.rank ?? 0;
    return [7, rankGroups[0].rank, kicker];
  }

  if (rankGroups[0].count === 3 && rankGroups[1]?.count === 2) {
    return [6, rankGroups[0].rank, rankGroups[1].rank];
  }

  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];

  if (rankGroups[0].count === 3) {
    const kickers = rankGroups.filter((group) => group.count === 1).map((group) => group.rank).sort((a, b) => b - a);
    return [3, rankGroups[0].rank, ...kickers];
  }

  if (rankGroups[0].count === 2 && rankGroups[1]?.count === 2) {
    const pairs = rankGroups.filter((group) => group.count === 2).map((group) => group.rank).sort((a, b) => b - a);
    const kicker = rankGroups.find((group) => group.count === 1)?.rank ?? 0;
    return [2, pairs[0], pairs[1], kicker];
  }

  if (rankGroups[0].count === 2) {
    const kickers = rankGroups.filter((group) => group.count === 1).map((group) => group.rank).sort((a, b) => b - a);
    return [1, rankGroups[0].rank, ...kickers];
  }

  return [0, ...ranks];
};

const fiveCardCombos = [
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 5],
  [0, 1, 2, 3, 6],
  [0, 1, 2, 4, 5],
  [0, 1, 2, 4, 6],
  [0, 1, 2, 5, 6],
  [0, 1, 3, 4, 5],
  [0, 1, 3, 4, 6],
  [0, 1, 3, 5, 6],
  [0, 1, 4, 5, 6],
  [0, 2, 3, 4, 5],
  [0, 2, 3, 4, 6],
  [0, 2, 3, 5, 6],
  [0, 2, 4, 5, 6],
  [0, 3, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [1, 2, 3, 4, 6],
  [1, 2, 3, 5, 6],
  [1, 2, 4, 5, 6],
  [1, 3, 4, 5, 6],
  [2, 3, 4, 5, 6]
];

const evaluateSeven = (cards) => {
  let best = null;

  fiveCardCombos.forEach((combo) => {
    const score = evaluateFive(combo.map((index) => cards[index]));
    if (!best || scoreCompare(score, best) > 0) best = score;
  });

  return best;
};

const deckCards = () => {
  const cards = [];
  Object.entries(RANK_VALUES).forEach(([rankKey, rankValue]) => {
    SUITS.forEach((suit) => {
      cards.push({ rank: rankValue, suit, code: `${rankKey}${suit}` });
    });
  });
  return cards;
};

const shuffleInPlace = (cards) => {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
};

const parseCardCode = (code) => {
  const rankKey = code?.[0];
  const suit = code?.[1];
  const rank = RANK_VALUES[rankKey];
  if (!rank || !SUITS.includes(suit)) return null;
  return { rank, suit, code };
};

export const runPokerSimulation = ({ heroCardCodes, boardCardCodes, opponents, iterations }) => {
  const heroCards = heroCardCodes.map(parseCardCode);
  const boardCards = boardCardCodes.map(parseCardCode);

  if (heroCards.some((card) => !card) || boardCards.some((card) => !card)) {
    throw new Error('Invalid card selection.');
  }

  const knownCardCodes = [...heroCardCodes, ...boardCardCodes];
  if (new Set(knownCardCodes).size !== knownCardCodes.length) {
    throw new Error('Duplicate cards selected.');
  }
  const deadCardCodes = new Set(knownCardCodes);
  const availableDeck = deckCards().filter((card) => !deadCardCodes.has(card.code));
  const boardCardsNeeded = 5 - boardCards.length;
  const oppCardCount = opponents * 2;

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let equityShare = 0;

  for (let i = 0; i < iterations; i += 1) {
    const deck = [...availableDeck];
    shuffleInPlace(deck);

    const drawCount = boardCardsNeeded + oppCardCount;
    const drawn = deck.slice(0, drawCount);
    const fullBoard = [...boardCards, ...drawn.slice(0, boardCardsNeeded)];
    const heroScore = evaluateSeven([...heroCards, ...fullBoard]);

    const opponentScores = [];
    for (let p = 0; p < opponents; p += 1) {
      const base = boardCardsNeeded + p * 2;
      const oppCards = [drawn[base], drawn[base + 1]];
      opponentScores.push(evaluateSeven([...oppCards, ...fullBoard]));
    }

    const allScores = [heroScore, ...opponentScores];
    let best = allScores[0];
    allScores.forEach((score) => {
      if (scoreCompare(score, best) > 0) best = score;
    });

    const winners = allScores.filter((score) => scoreCompare(score, best) === 0).length;
    const heroBest = scoreCompare(heroScore, best) === 0;

    if (!heroBest) {
      losses += 1;
      continue;
    }

    if (winners === 1) {
      wins += 1;
      equityShare += 1;
      continue;
    }

    ties += 1;
    equityShare += 1 / winners;
  }

  return {
    wins,
    losses,
    ties,
    iterations,
    winPct: (wins / iterations) * 100,
    lossPct: (losses / iterations) * 100,
    tiePct: (ties / iterations) * 100,
    equityPct: (equityShare / iterations) * 100
  };
};

const positionBias = {
  early: -0.02,
  middle: 0,
  late: 0.015,
  blind: -0.01
};

export const getMoveRecommendation = ({ equityPct, opponents, position, potSize, toCall, stackBb, boardCount }) => {
  const equity = equityPct / 100;
  const multiwayPenalty = Math.max(0, opponents - 1) * 0.015;
  const adjustedEquity = Math.max(0, equity + (positionBias[position] ?? 0) - multiwayPenalty);
  const callAmount = Math.max(0, toCall);
  const currentPot = Math.max(0, potSize);
  const potOdds = callAmount > 0 ? callAmount / (currentPot + callAmount) : 0;
  const street = boardCount === 0 ? 'Preflop' : boardCount === 3 ? 'Flop' : boardCount === 4 ? 'Turn' : 'River';

  if (callAmount === 0) {
    if (adjustedEquity >= 0.62) {
      return {
        action: stackBb <= 20 ? 'Aggressive Bet / Jam' : 'Value Bet / Raise',
        street,
        reason: `Strong estimated equity (${equityPct.toFixed(1)}%) with no call pressure.`
      };
    }

    if (adjustedEquity >= 0.45) {
      return {
        action: 'Check or Small Probe Bet',
        street,
        reason: `Medium strength spot (${equityPct.toFixed(1)}%) where pot control is reasonable.`
      };
    }

    return {
      action: 'Check / Fold to Heavy Action',
      street,
      reason: `Equity is likely too low (${equityPct.toFixed(1)}%) for building a big pot.`
    };
  }

  const edge = adjustedEquity - potOdds;

  if (edge < -0.02) {
    return {
      action: 'Fold',
      street,
      reason: `Estimated equity (${equityPct.toFixed(1)}%) is below pot-odds requirement (${(potOdds * 100).toFixed(1)}%).`
    };
  }

  if (edge > 0.12) {
    return {
      action: stackBb <= 20 ? 'Raise / Jam' : 'Raise',
      street,
      reason: `Large equity edge over pot odds (${(edge * 100).toFixed(1)} pts).`
    };
  }

  return {
    action: 'Call',
    street,
    reason: `Equity is close to or above pot-odds threshold (${(potOdds * 100).toFixed(1)}%).`
  };
};
