import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  businessData,
  foodLogs,
  hikingSessions as hikingSessionSeed,
  pokerSessions as pokerSessionSeed,
  shoes as shoeSeed,
  workouts
} from '../data/trackerData';
import {
  filterByDashboardWindow,
  filterByMonthRange,
  filterByWindow,
  formatCurrency,
  formatNumber,
  timeWindows
} from '../utils/filters';
import { CARD_OPTIONS, getMoveRecommendation, runPokerSimulation } from '../utils/pokerSimulator';

const panelClass = 'rounded-2xl border border-cyan-400/30 bg-slate-900/55 p-5 text-cyan-50 shadow-neon';
const blockClass = 'rounded-xl border border-cyan-200/20 bg-black/30 p-4';
const formatMiles = (value) => `${Number(value).toFixed(2)} mi`;
const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
const formatDuration = (value) => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '--';

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
};
const getTodayLocal = () => {
  const now = new Date();
  const adjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};
const monthLabelFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const formatMonthLabel = (monthKey) => monthLabelFormatter.format(new Date(`${monthKey}-01T00:00:00`));
const simulatorPositions = [
  { key: 'early', label: 'Early Position' },
  { key: 'middle', label: 'Middle Position' },
  { key: 'late', label: 'Late Position' },
  { key: 'blind', label: 'Blinds' }
];
const simulationIterationOptions = [1500, 3000, 6000];
const boardCardLabels = ['Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'];
const normalizeShoeEntry = (entry, index = 0) => {
  const parsedPrice = Number(entry.price);
  const parsedWearCount = Number(entry.wearCount);

  return {
    id: entry.id ?? null,
    key: entry.id ?? `shoe-${index}`,
    name: entry.name ?? '',
    brand: entry.brand ?? 'Unknown',
    whereBought: entry.whereBought ?? entry.store ?? entry.status ?? '',
    purchaseDate: entry.purchaseDate ?? entry.dateBought ?? '',
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    wearCount: Number.isFinite(parsedWearCount) ? parsedWearCount : 0,
    notes: entry.notes ?? '',
    imageDataUrl: entry.imageDataUrl ?? ''
  };
};
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

const timeframeOptions = Object.entries(timeWindows);

const TimeWindowButtons = ({ value, onChange }) => (
  <div className="mb-4 flex flex-wrap gap-2">
    {timeframeOptions.map(([key, label]) => (
      <button
        className={`rounded-full border px-3 py-1 text-xs transition ${
          value === key
            ? 'border-cyan-300 bg-cyan-300/20 text-cyan-50'
            : 'border-cyan-800/80 bg-slate-950/55 text-cyan-200 hover:border-cyan-400'
        }`}
        key={key}
        onClick={() => onChange(key)}
        type="button"
      >
        {label}
      </button>
    ))}
  </div>
);

const PokerPanel = ({ pokerSessions, onAddPokerSession, onDeletePokerSession, onUpdatePokerSession }) => {
  const [window, setWindow] = useState('monthly');
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [sessionDate, setSessionDate] = useState(() => getTodayLocal());
  const [startingBankroll, setStartingBankroll] = useState('');
  const [result, setResult] = useState('');
  const [showLoggedSessions, setShowLoggedSessions] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionDate, setEditSessionDate] = useState('');
  const [editStartingBankroll, setEditStartingBankroll] = useState('');
  const [editResult, setEditResult] = useState('');
  const [showSimulator, setShowSimulator] = useState(true);
  const [heroCardOne, setHeroCardOne] = useState('As');
  const [heroCardTwo, setHeroCardTwo] = useState('Kh');
  const [boardCardCodes, setBoardCardCodes] = useState(['', '', '', '', '']);
  const [opponentCount, setOpponentCount] = useState('1');
  const [tablePosition, setTablePosition] = useState('middle');
  const [stackBb, setStackBb] = useState('100');
  const [potSize, setPotSize] = useState('100');
  const [toCall, setToCall] = useState('20');
  const [simulationIterations, setSimulationIterations] = useState('3000');
  const [simulationError, setSimulationError] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);

  const sessions = pokerSessions ?? pokerSessionSeed;

  const filtered = useMemo(() => {
    const byWindow = filterByWindow(sessions, window);
    const byMonth = filterByMonthRange(byWindow, fromMonth, toMonth);
    return [...byMonth].sort((a, b) => b.date.localeCompare(a.date));
  }, [fromMonth, sessions, toMonth, window]);

  const total = filtered.reduce((sum, session) => sum + session.result, 0);
  const sessionCount = filtered.length;
  const avgResult = sessionCount ? total / sessionCount : 0;
  const avgStarting = sessionCount
    ? filtered.reduce((sum, session) => sum + (session.startingBankroll ?? 0), 0) / sessionCount
    : 0;
  const groupedSessions = useMemo(() => {
    const groups = [];

    filtered.forEach((session) => {
      const monthKey = session.date.slice(0, 7);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.monthKey !== monthKey) {
        groups.push({ monthKey, label: formatMonthLabel(monthKey), entries: [session] });
      } else {
        lastGroup.entries.push(session);
      }
    });

    return groups;
  }, [filtered]);
  const simulatorBoardCards = boardCardCodes.filter(Boolean);
  const simulatorChosenCards = [heroCardOne, heroCardTwo, ...simulatorBoardCards];
  const isCardOptionDisabled = (optionCode, currentValue) =>
    optionCode !== currentValue && simulatorChosenCards.includes(optionCode);

  const handleBoardCardChange = (index, value) => {
    setBoardCardCodes((prev) => prev.map((code, codeIndex) => (codeIndex === index ? value : code)));
  };

  const handleRunSimulation = () => {
    setSimulationError('');
    setSimulationResult(null);

    const boardCount = simulatorBoardCards.length;
    if (![0, 3, 4, 5].includes(boardCount)) {
      setSimulationError('Board must have 0, 3, 4, or 5 cards.');
      return;
    }

    if (!heroCardOne || !heroCardTwo || heroCardOne === heroCardTwo) {
      setSimulationError('Choose two different hero cards.');
      return;
    }

    if (new Set(simulatorChosenCards).size !== simulatorChosenCards.length) {
      setSimulationError('Duplicate cards are not allowed.');
      return;
    }

    const parsedOpponents = Number(opponentCount);
    const parsedIterations = Number(simulationIterations);
    const parsedPotSize = Number(potSize);
    const parsedToCall = Number(toCall);
    const parsedStackBb = Number(stackBb);

    if (!parsedOpponents || parsedOpponents < 1 || parsedOpponents > 8) {
      setSimulationError('Opponent count must be between 1 and 8.');
      return;
    }

    if (!parsedIterations || parsedIterations < 500) {
      setSimulationError('Use at least 500 simulation iterations.');
      return;
    }

    if (parsedPotSize < 0 || parsedToCall < 0 || parsedStackBb <= 0) {
      setSimulationError('Pot, call amount, and stack BB must be valid positive numbers.');
      return;
    }

    try {
      const result = runPokerSimulation({
        heroCardCodes: [heroCardOne, heroCardTwo],
        boardCardCodes: simulatorBoardCards,
        opponents: parsedOpponents,
        iterations: parsedIterations
      });

      const recommendation = getMoveRecommendation({
        equityPct: result.equityPct,
        opponents: parsedOpponents,
        position: tablePosition,
        potSize: parsedPotSize,
        toCall: parsedToCall,
        stackBb: parsedStackBb,
        boardCount
      });

      setSimulationResult({
        ...result,
        recommendation,
        heroCardCodes: [heroCardOne, heroCardTwo],
        boardCardCodes: simulatorBoardCards
      });
    } catch {
      setSimulationError('Simulation failed. Check your card selections and try again.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onAddPokerSession) return;

    const parsedStarting = Number(startingBankroll);
    const parsedResult = Number(result);

    if (!sessionDate || Number.isNaN(parsedStarting) || Number.isNaN(parsedResult) || parsedStarting < 0) return;

    onAddPokerSession({
      date: sessionDate,
      startingBankroll: parsedStarting,
      result: parsedResult
    });

    setStartingBankroll('');
    setResult('');
  };

  const resetPokerEditState = () => {
    setEditingSessionId(null);
    setEditSessionDate('');
    setEditStartingBankroll('');
    setEditResult('');
  };

  const startEditingPokerSession = (session) => {
    setPendingDeleteId(null);
    setEditingSessionId(session.id ?? null);
    setEditSessionDate(session.date);
    setEditStartingBankroll(String(session.startingBankroll ?? 0));
    setEditResult(String(session.result ?? 0));
  };

  const handleSavePokerEdit = (sessionId) => {
    if (!sessionId || !onUpdatePokerSession) return;

    const parsedStarting = Number(editStartingBankroll);
    const parsedResult = Number(editResult);

    if (!editSessionDate || Number.isNaN(parsedStarting) || Number.isNaN(parsedResult) || parsedStarting < 0) {
      return;
    }

    onUpdatePokerSession(sessionId, {
      date: editSessionDate,
      startingBankroll: parsedStarting,
      result: parsedResult
    });

    resetPokerEditState();
  };

  return (
    <section className={panelClass}>
      <h2 className="mb-1 font-display text-2xl">Poker Winnings / Losses</h2>
      <p className="mb-4 text-sm text-cyan-100/80">Log each session with date, starting money, and win/loss amount.</p>

      <form className="mb-4 grid gap-3 rounded-xl border border-cyan-200/20 bg-black/25 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={handleSubmit}>
        <label className="text-sm text-cyan-100/80">
          Date
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setSessionDate(event.target.value)}
            required
            type="date"
            value={sessionDate}
          />
        </label>
        <label className="text-sm text-cyan-100/80">
          Starting Money
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            min="0"
            onChange={(event) => setStartingBankroll(event.target.value)}
            required
            step="1"
            type="number"
            value={startingBankroll}
          />
        </label>
        <label className="text-sm text-cyan-100/80">
          Won / Lost
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setResult(event.target.value)}
            required
            step="1"
            type="number"
            value={result}
          />
        </label>

        <button
          className="self-end rounded-lg border border-cyan-300/60 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/25"
          type="submit"
        >
          Log Session
        </button>
      </form>

      <p className="mb-4 text-xs text-cyan-200/70">Enter wins as positive numbers and losses as negative numbers.</p>

      <TimeWindowButtons onChange={setWindow} value={window} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-cyan-100/80">
          From Month
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setFromMonth(event.target.value)}
            type="month"
            value={fromMonth}
          />
        </label>
        <label className="text-sm text-cyan-100/80">
          To Month
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setToMonth(event.target.value)}
            type="month"
            value={toMonth}
          />
        </label>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Net</p>
          <p className={`text-xl font-semibold ${total >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatCurrency(total)}
          </p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Sessions</p>
          <p className="text-xl font-semibold text-cyan-50">{sessionCount}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Avg Win / Loss</p>
          <p className="text-xl font-semibold text-cyan-50">{formatCurrency(avgResult)}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Avg Starting</p>
          <p className="text-xl font-semibold text-cyan-50">{formatCurrency(avgStarting)}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-cyan-300/20">
        <button
          aria-expanded={showSimulator}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-900/20"
          onClick={() => setShowSimulator((prev) => !prev)}
          type="button"
        >
          <span>Poker Simulator</span>
          <span className="text-cyan-300">{showSimulator ? 'Hide' : 'Show'}</span>
        </button>

        {showSimulator ? (
          <div className="border-t border-cyan-300/20 p-3">
            <p className="mb-3 text-xs text-cyan-200/75">
              Texas Hold&apos;em simulator: estimate your win/tie/loss percentages and get a baseline move recommendation.
            </p>

            <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm text-cyan-100/80">
                Hero Card 1
                <select
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  onChange={(event) => setHeroCardOne(event.target.value)}
                  value={heroCardOne}
                >
                  {CARD_OPTIONS.map((option) => (
                    <option
                      disabled={isCardOptionDisabled(option.value, heroCardOne)}
                      key={`hero-one-${option.value}`}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-cyan-100/80">
                Hero Card 2
                <select
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  onChange={(event) => setHeroCardTwo(event.target.value)}
                  value={heroCardTwo}
                >
                  {CARD_OPTIONS.map((option) => (
                    <option
                      disabled={isCardOptionDisabled(option.value, heroCardTwo)}
                      key={`hero-two-${option.value}`}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-cyan-100/80">
                Opponents
                <select
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  onChange={(event) => setOpponentCount(event.target.value)}
                  value={opponentCount}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                    <option key={`opponents-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-cyan-100/80">
                Position
                <select
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  onChange={(event) => setTablePosition(event.target.value)}
                  value={tablePosition}
                >
                  {simulatorPositions.map((position) => (
                    <option key={`position-${position.key}`} value={position.key}>
                      {position.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {boardCardLabels.map((label, index) => (
                <label className="text-sm text-cyan-100/80" key={label}>
                  {label}
                  <select
                    className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                    onChange={(event) => handleBoardCardChange(index, event.target.value)}
                    value={boardCardCodes[index]}
                  >
                    <option value="">Unknown</option>
                    {CARD_OPTIONS.map((option) => (
                      <option
                        disabled={isCardOptionDisabled(option.value, boardCardCodes[index])}
                        key={`${label}-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm text-cyan-100/80">
                Pot Size
                <input
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  min="0"
                  onChange={(event) => setPotSize(event.target.value)}
                  step="1"
                  type="number"
                  value={potSize}
                />
              </label>

              <label className="text-sm text-cyan-100/80">
                Amount To Call
                <input
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  min="0"
                  onChange={(event) => setToCall(event.target.value)}
                  step="1"
                  type="number"
                  value={toCall}
                />
              </label>

              <label className="text-sm text-cyan-100/80">
                Stack (BB)
                <input
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  min="1"
                  onChange={(event) => setStackBb(event.target.value)}
                  step="1"
                  type="number"
                  value={stackBb}
                />
              </label>

              <label className="text-sm text-cyan-100/80">
                Sim Iterations
                <select
                  className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
                  onChange={(event) => setSimulationIterations(event.target.value)}
                  value={simulationIterations}
                >
                  {simulationIterationOptions.map((value) => (
                    <option key={`iters-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mb-3">
              <button
                className="rounded-lg border border-cyan-300/60 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/25"
                onClick={handleRunSimulation}
                type="button"
              >
                Run Simulation
              </button>
            </div>

            {simulationError ? <p className="mb-3 text-sm text-rose-300">{simulationError}</p> : null}

            {simulationResult ? (
              <div className="rounded-lg border border-cyan-200/20 bg-black/30 p-3">
                <p className="text-sm text-cyan-100">
                  Hero: <span className="font-medium text-white">{simulationResult.heroCardCodes.join(' ')}</span> | Board:{' '}
                  <span className="font-medium text-white">
                    {simulationResult.boardCardCodes.length ? simulationResult.boardCardCodes.join(' ') : 'Unknown'}
                  </span>
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={blockClass}>
                    <p className="text-xs uppercase tracking-widest text-cyan-200/70">Win</p>
                    <p className="text-lg font-semibold text-emerald-300">{simulationResult.winPct.toFixed(1)}%</p>
                  </div>
                  <div className={blockClass}>
                    <p className="text-xs uppercase tracking-widest text-cyan-200/70">Tie</p>
                    <p className="text-lg font-semibold text-cyan-100">{simulationResult.tiePct.toFixed(1)}%</p>
                  </div>
                  <div className={blockClass}>
                    <p className="text-xs uppercase tracking-widest text-cyan-200/70">Loss</p>
                    <p className="text-lg font-semibold text-rose-300">{simulationResult.lossPct.toFixed(1)}%</p>
                  </div>
                  <div className={blockClass}>
                    <p className="text-xs uppercase tracking-widest text-cyan-200/70">Equity</p>
                    <p className="text-lg font-semibold text-white">{simulationResult.equityPct.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-orange-300/25 bg-orange-300/10 p-3">
                  <p className="text-xs uppercase tracking-widest text-orange-100/90">Proper Move (Baseline)</p>
                  <p className="mt-1 text-lg font-semibold text-orange-100">
                    {simulationResult.recommendation.street}: {simulationResult.recommendation.action}
                  </p>
                  <p className="text-sm text-orange-100/90">{simulationResult.recommendation.reason}</p>
                  <p className="mt-1 text-xs text-orange-100/70">
                    Based on {simulationResult.iterations.toLocaleString()} Monte Carlo iterations and current pot setup.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-cyan-300/20">
        <button
          aria-expanded={showLoggedSessions}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-900/20"
          onClick={() =>
            setShowLoggedSessions((prev) => {
              if (prev) {
                setPendingDeleteId(null);
                resetPokerEditState();
              }
              return !prev;
            })
          }
          type="button"
        >
          <span>Logged Sessions ({sessionCount})</span>
          <span className="text-cyan-300">{showLoggedSessions ? 'Hide' : 'Show'}</span>
        </button>

        {showLoggedSessions ? (
          <div className="overflow-x-auto border-t border-cyan-300/20">
            <table className="w-full text-sm">
              <thead className="bg-cyan-900/35 text-cyan-100">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Starting Money</th>
                  <th className="px-3 py-2 text-right">Won / Lost</th>
                  <th className="px-3 py-2 text-right">Ending Money</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedSessions.map((group) => {
                  const groupNet = group.entries.reduce((sum, entry) => sum + entry.result, 0);

                  return (
                    <Fragment key={group.monthKey}>
                      <tr className="border-t border-cyan-300/30 bg-cyan-900/20 text-cyan-100">
                        <td className="px-3 py-2 font-medium" colSpan={5}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{group.label}</span>
                            <span className={`text-xs ${groupNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {group.entries.length} sessions • {formatCurrency(groupNet)}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {group.entries.map((session, index) => {
                        const starting = session.startingBankroll ?? 0;
                        const ending = starting + session.result;
                        const isDeletable = Boolean(session.id && onDeletePokerSession);
                        const isEditable = Boolean(session.id && onUpdatePokerSession);
                        const needsConfirm = pendingDeleteId === session.id;
                        const isEditing = editingSessionId === session.id;

                        if (isEditing) {
                          return (
                            <tr className="border-t border-cyan-100/10" key={session.id ?? `${session.date}-${index}`}>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditSessionDate(event.target.value)}
                                  type="date"
                                  value={editSessionDate}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  className="w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-right text-sm text-cyan-100"
                                  min="0"
                                  onChange={(event) => setEditStartingBankroll(event.target.value)}
                                  step="1"
                                  type="number"
                                  value={editStartingBankroll}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  className="w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-right text-sm text-cyan-100"
                                  onChange={(event) => setEditResult(event.target.value)}
                                  step="1"
                                  type="number"
                                  value={editResult}
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-cyan-200">Auto</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    className="rounded border border-emerald-300/50 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-100 transition hover:bg-emerald-500/30"
                                    onClick={() => handleSavePokerEdit(session.id)}
                                    type="button"
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                    onClick={resetPokerEditState}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr className="border-t border-cyan-100/10" key={session.id ?? `${session.date}-${index}`}>
                            <td className="px-3 py-2">{session.date}</td>
                            <td className="px-3 py-2 text-right text-cyan-100">{formatCurrency(starting)}</td>
                            <td className={`px-3 py-2 text-right ${session.result >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {formatCurrency(session.result)}
                            </td>
                            <td className={`px-3 py-2 text-right ${ending >= 0 ? 'text-cyan-50' : 'text-rose-300'}`}>
                              {formatCurrency(ending)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {needsConfirm ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    className="rounded border border-rose-300/50 bg-rose-500/20 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/30"
                                    onClick={() => {
                                      if (session.id && onDeletePokerSession) {
                                        onDeletePokerSession(session.id);
                                      }
                                      setPendingDeleteId(null);
                                    }}
                                    type="button"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                    onClick={() => setPendingDeleteId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    className="rounded border border-cyan-300/45 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition enabled:hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                    disabled={!isEditable}
                                    onClick={() => startEditingPokerSession(session)}
                                    type="button"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="rounded border border-rose-300/45 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition enabled:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                    disabled={!isDeletable}
                                    onClick={() => {
                                      if (session.id && onDeletePokerSession) {
                                        resetPokerEditState();
                                        setPendingDeleteId(session.id);
                                      }
                                    }}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const HikingPanel = ({ hikingSessions, onAddHikeSession, onDeleteHikeSession, onUpdateHikeSession }) => {
  const [window, setWindow] = useState('monthly');
  const [hikeDate, setHikeDate] = useState(() => getTodayLocal());
  const [hikeLocation, setHikeLocation] = useState('');
  const [hikeMiles, setHikeMiles] = useState('');
  const [hikeDuration, setHikeDuration] = useState('');
  const [showLoggedHikes, setShowLoggedHikes] = useState(false);
  const [pendingDeleteHikeId, setPendingDeleteHikeId] = useState(null);
  const [editingHikeId, setEditingHikeId] = useState(null);
  const [editHikeDate, setEditHikeDate] = useState('');
  const [editHikeLocation, setEditHikeLocation] = useState('');
  const [editHikeMiles, setEditHikeMiles] = useState('');
  const [editHikeDuration, setEditHikeDuration] = useState('');

  const sessions = (hikingSessions ?? hikingSessionSeed).map((hike) => ({
    ...hike,
    location: hike.location ?? hike.trail ?? 'Unknown'
  }));

  const filtered = useMemo(() => {
    const byWindow = filterByWindow(sessions, window);
    return [...byWindow].sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, window]);

  const totalMiles = filtered.reduce((sum, item) => sum + item.miles, 0);
  const totalDuration = filtered.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);
  const avgMiles = filtered.length ? totalMiles / filtered.length : 0;
  const groupedHikes = useMemo(() => {
    const groups = [];

    filtered.forEach((hike) => {
      const monthKey = hike.date.slice(0, 7);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.monthKey !== monthKey) {
        groups.push({ monthKey, label: formatMonthLabel(monthKey), entries: [hike] });
      } else {
        lastGroup.entries.push(hike);
      }
    });

    return groups;
  }, [filtered]);

  const handleAddHike = (event) => {
    event.preventDefault();
    if (!onAddHikeSession) return;

    const parsedMiles = Number(hikeMiles);
    const parsedDuration = Number(hikeDuration);
    const location = hikeLocation.trim();
    const durationMinutes = hikeDuration.trim() === '' ? null : parsedDuration;

    if (
      !hikeDate ||
      !location ||
      Number.isNaN(parsedMiles) ||
      parsedMiles <= 0 ||
      (durationMinutes !== null && (Number.isNaN(durationMinutes) || durationMinutes <= 0))
    ) {
      return;
    }

    onAddHikeSession({
      date: hikeDate,
      location,
      miles: Number(parsedMiles.toFixed(2)),
      durationMinutes: durationMinutes === null ? null : Math.round(durationMinutes)
    });

    setHikeLocation('');
    setHikeMiles('');
    setHikeDuration('');
  };

  const resetEditState = () => {
    setEditingHikeId(null);
    setEditHikeDate('');
    setEditHikeLocation('');
    setEditHikeMiles('');
    setEditHikeDuration('');
  };

  const startEditingHike = (hike) => {
    setPendingDeleteHikeId(null);
    setEditingHikeId(hike.id ?? null);
    setEditHikeDate(hike.date);
    setEditHikeLocation(hike.location);
    setEditHikeMiles(String(Number(hike.miles).toFixed(2)));
    setEditHikeDuration(hike.durationMinutes == null ? '' : String(hike.durationMinutes));
  };

  const handleSaveHikeEdit = (hikeId) => {
    if (!hikeId || !onUpdateHikeSession) return;

    const parsedMiles = Number(editHikeMiles);
    const parsedDuration = Number(editHikeDuration);
    const location = editHikeLocation.trim();
    const durationMinutes = editHikeDuration.trim() === '' ? null : parsedDuration;

    if (
      !editHikeDate ||
      !location ||
      Number.isNaN(parsedMiles) ||
      parsedMiles <= 0 ||
      (durationMinutes !== null && (Number.isNaN(durationMinutes) || durationMinutes <= 0))
    ) {
      return;
    }

    onUpdateHikeSession(hikeId, {
      date: editHikeDate,
      location,
      miles: Number(parsedMiles.toFixed(2)),
      durationMinutes: durationMinutes === null ? null : Math.round(durationMinutes)
    });

    resetEditState();
  };

  return (
    <section className={panelClass}>
      <h2 className="mb-1 font-display text-2xl">Mileage Hiked</h2>
      <p className="mb-4 text-sm text-cyan-100/80">Add hikes with location, mileage to the hundredth, and optional duration, then review by month.</p>

      <form className="mb-4 grid gap-3 rounded-xl border border-cyan-200/20 bg-black/25 p-3 lg:grid-cols-[1fr_1.5fr_1fr_1fr_auto]" onSubmit={handleAddHike}>
        <label className="text-sm text-cyan-100/80">
          Date
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setHikeDate(event.target.value)}
            required
            type="date"
            value={hikeDate}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Location
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setHikeLocation(event.target.value)}
            placeholder="Trail or location"
            required
            type="text"
            value={hikeLocation}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Mileage
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            min="0.01"
            onChange={(event) => setHikeMiles(event.target.value)}
            required
            step="0.01"
            type="number"
            value={hikeMiles}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Duration (min)
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            min="1"
            onChange={(event) => setHikeDuration(event.target.value)}
            placeholder="Optional"
            step="1"
            type="number"
            value={hikeDuration}
          />
        </label>

        <button
          className="self-end rounded-lg border border-cyan-300/60 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/25"
          type="submit"
        >
          Add Hike
        </button>
      </form>

      <TimeWindowButtons onChange={setWindow} value={window} />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Total Miles</p>
          <p className="text-2xl font-semibold text-emerald-300">{formatMiles(totalMiles)}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Hikes Logged</p>
          <p className="text-2xl font-semibold text-cyan-50">{filtered.length}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Avg / Hike</p>
          <p className="text-2xl font-semibold text-cyan-50">{formatMiles(avgMiles)}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Total Duration</p>
          <p className="text-2xl font-semibold text-cyan-50">{formatDuration(totalDuration)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-300/20">
        <button
          aria-expanded={showLoggedHikes}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-900/20"
          onClick={() =>
            setShowLoggedHikes((prev) => {
              if (prev) {
                setPendingDeleteHikeId(null);
                resetEditState();
              }
              return !prev;
            })
          }
          type="button"
        >
          <span>Logged Hikes ({filtered.length})</span>
          <span className="text-cyan-300">{showLoggedHikes ? 'Hide' : 'Show'}</span>
        </button>

        {showLoggedHikes ? (
          <div className="border-t border-cyan-300/20">
            <ul className="space-y-0">
              {groupedHikes.map((group) => {
                const groupMiles = group.entries.reduce((sum, hike) => sum + hike.miles, 0);

                return (
                  <li key={group.monthKey}>
                    <div className="flex items-center justify-between gap-2 border-t border-cyan-300/30 bg-cyan-900/20 px-3 py-2 text-sm text-cyan-100">
                      <span className="font-medium">{group.label}</span>
                      <span className="text-xs text-emerald-300">
                        {group.entries.length} hikes • {formatMiles(groupMiles)}
                      </span>
                    </div>

                    {group.entries.map((hike, index) => {
                      const canDelete = Boolean(hike.id && onDeleteHikeSession);
                      const canEdit = Boolean(hike.id && onUpdateHikeSession);
                      const needsConfirm = pendingDeleteHikeId === hike.id;
                      const isEditing = editingHikeId === hike.id;

                      if (isEditing) {
                        return (
                          <div className="border-t border-cyan-100/10 px-3 py-2" key={hike.id ?? `${hike.date}-${hike.location}-${index}`}>
                            <div className="grid gap-2 lg:grid-cols-[1fr_1.5fr_1fr_1fr_auto]">
                              <label className="text-xs text-cyan-100/80">
                                Date
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditHikeDate(event.target.value)}
                                  type="date"
                                  value={editHikeDate}
                                />
                              </label>

                              <label className="text-xs text-cyan-100/80">
                                Location
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditHikeLocation(event.target.value)}
                                  type="text"
                                  value={editHikeLocation}
                                />
                              </label>

                              <label className="text-xs text-cyan-100/80">
                                Miles
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  min="0.01"
                                  onChange={(event) => setEditHikeMiles(event.target.value)}
                                  step="0.01"
                                  type="number"
                                  value={editHikeMiles}
                                />
                              </label>

                              <label className="text-xs text-cyan-100/80">
                                Duration (min)
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  min="1"
                                  onChange={(event) => setEditHikeDuration(event.target.value)}
                                  step="1"
                                  type="number"
                                  value={editHikeDuration}
                                />
                              </label>

                              <div className="flex items-end gap-1 lg:justify-end">
                                <button
                                  className="rounded border border-emerald-300/50 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-100 transition hover:bg-emerald-500/30"
                                  onClick={() => handleSaveHikeEdit(hike.id)}
                                  type="button"
                                >
                                  Save
                                </button>
                                <button
                                  className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                  onClick={resetEditState}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="border-t border-cyan-100/10 px-3 py-2" key={hike.id ?? `${hike.date}-${hike.location}-${index}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-cyan-50">{hike.location}</p>
                              <p className="text-xs text-cyan-100/75">
                                {hike.date} • {formatDuration(hike.durationMinutes)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-emerald-300">{formatMiles(hike.miles)}</p>
                              {needsConfirm ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    className="rounded border border-rose-300/50 bg-rose-500/20 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/30"
                                    onClick={() => {
                                      if (hike.id && onDeleteHikeSession) {
                                        onDeleteHikeSession(hike.id);
                                      }
                                      setPendingDeleteHikeId(null);
                                    }}
                                    type="button"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                    onClick={() => setPendingDeleteHikeId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    className="rounded border border-cyan-300/45 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition enabled:hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                    disabled={!canEdit}
                                    onClick={() => startEditingHike(hike)}
                                    type="button"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="rounded border border-rose-300/45 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition enabled:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                    disabled={!canDelete}
                                    onClick={() => {
                                      if (hike.id && onDeleteHikeSession) {
                                        resetEditState();
                                        setPendingDeleteHikeId(hike.id);
                                      }
                                    }}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const WorkoutPanel = () => {
  const [window, setWindow] = useState('monthly');
  const [type, setType] = useState('all');

  const windowed = useMemo(() => filterByWindow(workouts, window), [window]);
  const types = ['all', ...new Set(workouts.map((item) => item.type))];
  const filtered = windowed.filter((entry) => type === 'all' || entry.type === type);

  return (
    <section className={panelClass}>
      <h2 className="mb-1 font-display text-2xl">Workouts + PRs</h2>
      <p className="mb-4 text-sm text-cyan-100/80">Filter sessions by training type and capture personal records.</p>

      <TimeWindowButtons onChange={setWindow} value={window} />

      <label className="mb-4 inline-flex items-center gap-2 text-sm">
        <span className="text-cyan-100/85">Workout Type</span>
        <select
          className="rounded-lg border border-cyan-700 bg-slate-950/70 px-3 py-1.5 text-cyan-100"
          onChange={(event) => setType(event.target.value)}
          value={type}
        >
          {types.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'all' ? 'All Types' : entry}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Sessions</p>
          <p className="text-xl font-semibold">{filtered.length}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Total Minutes</p>
          <p className="text-xl font-semibold">{filtered.reduce((sum, item) => sum + item.duration, 0)}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Estimated Calories</p>
          <p className="text-xl font-semibold">{filtered.reduce((sum, item) => sum + item.calories, 0)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((entry) => (
          <div className="rounded-lg border border-cyan-200/15 bg-black/25 px-3 py-2" key={`${entry.date}-${entry.type}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{entry.type}</p>
                <p className="text-xs text-cyan-100/75">{entry.date} • {entry.duration} min</p>
              </div>
              <div className="text-right text-sm text-cyan-100">
                <p>{entry.calories} kcal</p>
                <p className="text-amber-200">{entry.pr ?? 'No PR logged'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ShoesPanel = ({ shoeCollection, onAddShoeEntry, onDeleteShoeEntry, onUpdateShoeEntry }) => {
  const [brand, setBrand] = useState('all');
  const [shoeName, setShoeName] = useState('');
  const [shoeBrand, setShoeBrand] = useState('');
  const [whereBought, setWhereBought] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => getTodayLocal());
  const [shoePrice, setShoePrice] = useState('');
  const [wearCount, setWearCount] = useState('0');
  const [shoeNotes, setShoeNotes] = useState('');
  const [shoeImageDataUrl, setShoeImageDataUrl] = useState('');
  const [shoeImageName, setShoeImageName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [expandedBrands, setExpandedBrands] = useState({});
  const [editingShoeId, setEditingShoeId] = useState(null);
  const [editShoeName, setEditShoeName] = useState('');
  const [editShoeBrand, setEditShoeBrand] = useState('');
  const [editWhereBought, setEditWhereBought] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editShoePrice, setEditShoePrice] = useState('');
  const [editWearCount, setEditWearCount] = useState('');
  const [editShoeNotes, setEditShoeNotes] = useState('');
  const [editShoeImageDataUrl, setEditShoeImageDataUrl] = useState('');
  const [editShoeImageName, setEditShoeImageName] = useState('');

  const entries = useMemo(
    () =>
      (shoeCollection ?? shoeSeed)
        .map((entry, index) => normalizeShoeEntry(entry, index))
        .sort((a, b) => {
          const brandCompare = a.brand.localeCompare(b.brand);
          if (brandCompare !== 0) return brandCompare;
          return a.name.localeCompare(b.name);
        }),
    [shoeCollection]
  );

  const brands = useMemo(
    () => ['all', ...new Set(entries.map((item) => item.brand).filter(Boolean))],
    [entries]
  );
  const filtered = useMemo(
    () => entries.filter((entry) => brand === 'all' || entry.brand === brand),
    [brand, entries]
  );
  const groupedByBrand = useMemo(() => {
    const groups = new Map();

    filtered.forEach((entry) => {
      const brandName = entry.brand || 'Unknown';
      if (!groups.has(brandName)) {
        groups.set(brandName, []);
      }
      groups.get(brandName).push(entry);
    });

    return Array.from(groups.entries()).map(([brandName, brandEntries]) => ({
      brand: brandName,
      entries: brandEntries,
      totalWears: brandEntries.reduce((sum, entry) => sum + Math.max(0, entry.wearCount), 0),
      totalValue: brandEntries.reduce((sum, entry) => sum + Math.max(0, entry.price), 0)
    }));
  }, [filtered]);
  const totalWears = filtered.reduce((sum, entry) => sum + Math.max(0, entry.wearCount), 0);
  const totalValue = filtered.reduce((sum, entry) => sum + Math.max(0, entry.price), 0);
  const averageWears = filtered.length ? totalWears / filtered.length : 0;

  useEffect(() => {
    setExpandedBrands((prev) => {
      const next = { ...prev };
      let changed = false;

      groupedByBrand.forEach((group) => {
        if (next[group.brand] === undefined) {
          next[group.brand] = true;
          changed = true;
        }
      });

      Object.keys(next).forEach((brandName) => {
        if (!groupedByBrand.some((group) => group.brand === brandName)) {
          delete next[brandName];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [groupedByBrand]);

  const handleShoeImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setShoeImageDataUrl('');
      setShoeImageName('');
      return;
    }

    if (!file.type.startsWith('image/')) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setShoeImageDataUrl(dataUrl);
      setShoeImageName(file.name);
    } catch {
      setShoeImageDataUrl('');
      setShoeImageName('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onAddShoeEntry) return;

    const name = shoeName.trim();
    const brandName = shoeBrand.trim();
    const store = whereBought.trim();
    const notes = shoeNotes.trim();
    const parsedPrice = Number(shoePrice);
    const parsedWearCount = Number(wearCount);

    if (
      !name ||
      !brandName ||
      !store ||
      !purchaseDate ||
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      Number.isNaN(parsedWearCount) ||
      parsedWearCount < 0
    ) {
      return;
    }

    onAddShoeEntry({
      name,
      brand: brandName,
      whereBought: store,
      purchaseDate,
      price: Number(parsedPrice.toFixed(2)),
      wearCount: Math.round(parsedWearCount),
      notes,
      imageDataUrl: shoeImageDataUrl
    });

    setShoeName('');
    setShoeBrand('');
    setWhereBought('');
    setPurchaseDate(getTodayLocal());
    setShoePrice('');
    setWearCount('0');
    setShoeNotes('');
    setShoeImageDataUrl('');
    setShoeImageName('');
  };

  const resetShoeEditState = () => {
    setEditingShoeId(null);
    setEditShoeName('');
    setEditShoeBrand('');
    setEditWhereBought('');
    setEditPurchaseDate('');
    setEditShoePrice('');
    setEditWearCount('');
    setEditShoeNotes('');
    setEditShoeImageDataUrl('');
    setEditShoeImageName('');
  };

  const startEditingShoe = (shoe) => {
    setPendingDeleteId(null);
    setEditingShoeId(shoe.id ?? null);
    setEditShoeName(shoe.name ?? '');
    setEditShoeBrand(shoe.brand ?? '');
    setEditWhereBought(shoe.whereBought ?? '');
    setEditPurchaseDate(shoe.purchaseDate ?? '');
    setEditShoePrice(String(Number(shoe.price ?? 0).toFixed(2)));
    setEditWearCount(String(Math.max(0, Math.round(shoe.wearCount ?? 0))));
    setEditShoeNotes(shoe.notes ?? '');
    setEditShoeImageDataUrl(shoe.imageDataUrl ?? '');
    setEditShoeImageName('');
  };

  const handleEditShoeImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEditShoeImageDataUrl(dataUrl);
      setEditShoeImageName(file.name);
    } catch {
      setEditShoeImageDataUrl('');
      setEditShoeImageName('');
    }
  };

  const handleSaveShoeEdit = (shoeId) => {
    if (!shoeId || !onUpdateShoeEntry) return;

    const name = editShoeName.trim();
    const brandName = editShoeBrand.trim();
    const store = editWhereBought.trim();
    const notes = editShoeNotes.trim();
    const parsedPrice = Number(editShoePrice);
    const parsedWearCount = Number(editWearCount);

    if (
      !name ||
      !brandName ||
      !store ||
      !editPurchaseDate ||
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      Number.isNaN(parsedWearCount) ||
      parsedWearCount < 0
    ) {
      return;
    }

    onUpdateShoeEntry(shoeId, {
      name,
      brand: brandName,
      whereBought: store,
      purchaseDate: editPurchaseDate,
      price: Number(parsedPrice.toFixed(2)),
      wearCount: Math.round(parsedWearCount),
      notes,
      imageDataUrl: editShoeImageDataUrl
    });

    resetShoeEditState();
  };

  const toggleBrandGroup = (brandName) => {
    setExpandedBrands((prev) => ({ ...prev, [brandName]: !(prev[brandName] ?? true) }));
  };

  return (
    <section className={panelClass}>
      <h2 className="mb-1 font-display text-2xl">Shoe Collection Locker</h2>
      <p className="mb-4 text-sm text-cyan-100/80">
        Log each pair with brand, purchase details, price, wear count, notes, and an optional image.
      </p>

      <form className="mb-4 grid gap-3 rounded-xl border border-cyan-200/20 bg-black/25 p-3 lg:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm text-cyan-100/80">
          Shoe
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setShoeName(event.target.value)}
            placeholder="Jordan 1 High"
            required
            type="text"
            value={shoeName}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Brand
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setShoeBrand(event.target.value)}
            placeholder="Nike"
            required
            type="text"
            value={shoeBrand}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Where Bought
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setWhereBought(event.target.value)}
            placeholder="GOAT, Nike, local shop..."
            required
            type="text"
            value={whereBought}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          When Bought
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            onChange={(event) => setPurchaseDate(event.target.value)}
            required
            type="date"
            value={purchaseDate}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Price
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            min="0"
            onChange={(event) => setShoePrice(event.target.value)}
            required
            step="0.01"
            type="number"
            value={shoePrice}
          />
        </label>

        <label className="text-sm text-cyan-100/80">
          Wears
          <input
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-1.5 text-cyan-100"
            min="0"
            onChange={(event) => setWearCount(event.target.value)}
            required
            step="1"
            type="number"
            value={wearCount}
          />
        </label>

        <label className="text-sm text-cyan-100/80 lg:col-span-2">
          Notes
          <textarea
            className="mt-1 min-h-20 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-2 text-cyan-100"
            onChange={(event) => setShoeNotes(event.target.value)}
            placeholder="Colorway, condition, sizing notes, outfit ideas..."
            value={shoeNotes}
          />
        </label>

        <label className="text-sm text-cyan-100/80 lg:col-span-2">
          Shoe Image (optional)
          <input
            accept="image/*"
            className="mt-1 w-full rounded-lg border border-cyan-700 bg-slate-950/65 px-3 py-2 text-cyan-100 file:mr-3 file:rounded file:border-0 file:bg-cyan-400/20 file:px-2 file:py-1 file:text-cyan-50"
            onChange={handleShoeImageChange}
            type="file"
          />
          {shoeImageName ? (
            <p className="mt-1 text-xs text-cyan-200/80">Selected: {shoeImageName}</p>
          ) : null}
          {shoeImageDataUrl ? (
            <div className="mt-2 flex items-center gap-3">
              <img alt="Shoe preview" className="h-16 w-16 rounded-lg border border-cyan-300/30 object-cover" src={shoeImageDataUrl} />
              <button
                className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                onClick={() => {
                  setShoeImageDataUrl('');
                  setShoeImageName('');
                }}
                type="button"
              >
                Remove Image
              </button>
            </div>
          ) : null}
        </label>

        <button
          className="rounded-lg border border-cyan-300/60 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/25 lg:col-span-2"
          type="submit"
        >
          Add To Locker
        </button>
      </form>

      <label className="mb-4 inline-flex items-center gap-2 text-sm">
        <span className="text-cyan-100/85">Sort By Brand</span>
        <select
          className="rounded-lg border border-cyan-700 bg-slate-950/70 px-3 py-1.5 text-cyan-100"
          onChange={(event) => setBrand(event.target.value)}
          value={brand}
        >
          {brands.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'all' ? 'All Brands' : entry}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Total Pairs</p>
          <p className="text-xl font-semibold">{filtered.length}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Total Wears</p>
          <p className="text-xl font-semibold text-emerald-300">{totalWears}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Avg Wears / Pair</p>
          <p className="text-xl font-semibold">{formatNumber(averageWears, 1)}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Total Collection Value</p>
          <p className="text-xl font-semibold text-cyan-50">{formatPrice(totalValue)}</p>
        </div>
      </div>

      {groupedByBrand.length ? (
        <div className="space-y-3">
          {groupedByBrand.map((group) => {
            const isExpanded = expandedBrands[group.brand] ?? true;

            return (
              <div className="rounded-xl border border-cyan-300/20 bg-black/20" key={group.brand}>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-900/20"
                  onClick={() => toggleBrandGroup(group.brand)}
                  type="button"
                >
                  <span>{group.brand}</span>
                  <span className="text-xs text-cyan-200/80">
                    {group.entries.length} pairs • {group.totalWears} wears • {isExpanded ? 'Hide' : 'Show'}
                  </span>
                </button>

                {isExpanded ? (
                  <ul className="space-y-0 border-t border-cyan-300/20">
                    {group.entries.map((shoe, index) => {
                      const canDelete = Boolean(shoe.id && onDeleteShoeEntry);
                      const canEdit = Boolean(shoe.id && onUpdateShoeEntry);
                      const needsConfirm = pendingDeleteId === shoe.id;
                      const isEditing = editingShoeId === shoe.id;

                      if (isEditing) {
                        return (
                          <li className="border-t border-cyan-100/10 px-3 py-3" key={shoe.key ?? `${shoe.brand}-${shoe.name}-${index}`}>
                            <div className="grid gap-2 lg:grid-cols-2">
                              <label className="text-xs text-cyan-100/80">
                                Shoe
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditShoeName(event.target.value)}
                                  type="text"
                                  value={editShoeName}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80">
                                Brand
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditShoeBrand(event.target.value)}
                                  type="text"
                                  value={editShoeBrand}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80">
                                Where Bought
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditWhereBought(event.target.value)}
                                  type="text"
                                  value={editWhereBought}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80">
                                When Bought
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditPurchaseDate(event.target.value)}
                                  type="date"
                                  value={editPurchaseDate}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80">
                                Price
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  min="0"
                                  onChange={(event) => setEditShoePrice(event.target.value)}
                                  step="0.01"
                                  type="number"
                                  value={editShoePrice}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80">
                                Wears
                                <input
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  min="0"
                                  onChange={(event) => setEditWearCount(event.target.value)}
                                  step="1"
                                  type="number"
                                  value={editWearCount}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80 lg:col-span-2">
                                Notes
                                <textarea
                                  className="mt-1 min-h-16 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100"
                                  onChange={(event) => setEditShoeNotes(event.target.value)}
                                  value={editShoeNotes}
                                />
                              </label>
                              <label className="text-xs text-cyan-100/80 lg:col-span-2">
                                Replace Image
                                <input
                                  accept="image/*"
                                  className="mt-1 w-full rounded border border-cyan-700 bg-slate-950/65 px-2 py-1 text-sm text-cyan-100 file:mr-2 file:rounded file:border-0 file:bg-cyan-400/20 file:px-2 file:py-1"
                                  onChange={handleEditShoeImageChange}
                                  type="file"
                                />
                                {editShoeImageName ? (
                                  <p className="mt-1 text-xs text-cyan-200/80">Selected: {editShoeImageName}</p>
                                ) : null}
                                {editShoeImageDataUrl ? (
                                  <div className="mt-2 flex items-center gap-2">
                                    <img
                                      alt="Edited shoe preview"
                                      className="h-14 w-14 rounded border border-cyan-300/30 object-cover"
                                      src={editShoeImageDataUrl}
                                    />
                                    <button
                                      className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                      onClick={() => {
                                        setEditShoeImageDataUrl('');
                                        setEditShoeImageName('');
                                      }}
                                      type="button"
                                    >
                                      Remove Image
                                    </button>
                                  </div>
                                ) : null}
                              </label>
                              <div className="flex items-end gap-1 lg:col-span-2 lg:justify-end">
                                <button
                                  className="rounded border border-emerald-300/50 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-100 transition hover:bg-emerald-500/30"
                                  onClick={() => handleSaveShoeEdit(shoe.id)}
                                  type="button"
                                >
                                  Save
                                </button>
                                <button
                                  className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                  onClick={resetShoeEditState}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li className="border-t border-cyan-100/10 px-3 py-2" key={shoe.key ?? `${shoe.brand}-${shoe.name}-${index}`}>
                          <div className="flex gap-3">
                            {shoe.imageDataUrl ? (
                              <img
                                alt={`${shoe.brand} ${shoe.name}`}
                                className="h-20 w-20 rounded-lg border border-cyan-300/30 object-cover"
                                src={shoe.imageDataUrl}
                              />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-900/25 text-[10px] uppercase tracking-widest text-cyan-200/80">
                                No Image
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-cyan-50">{shoe.name}</p>
                                  <p className="text-xs text-cyan-100/75">{shoe.brand}</p>
                                </div>
                                <p className="text-sm font-semibold text-cyan-100">{shoe.wearCount} wears</p>
                              </div>

                              <p className="text-xs text-cyan-200/80">
                                {shoe.whereBought || 'Unknown store'}
                                {shoe.purchaseDate ? ` • ${shoe.purchaseDate}` : ''}
                              </p>
                              <p className="text-sm text-emerald-300">{formatPrice(shoe.price)}</p>

                              {shoe.notes ? <p className="mt-1 text-xs text-cyan-100/80">{shoe.notes}</p> : null}

                              <div className="mt-2 flex justify-end gap-1">
                                {needsConfirm ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      className="rounded border border-rose-300/50 bg-rose-500/20 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/30"
                                      onClick={() => {
                                        if (shoe.id && onDeleteShoeEntry) {
                                          onDeleteShoeEntry(shoe.id);
                                        }
                                        setPendingDeleteId(null);
                                      }}
                                      type="button"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                                      onClick={() => setPendingDeleteId(null)}
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      className="rounded border border-cyan-300/45 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition enabled:hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                      disabled={!canEdit}
                                      onClick={() => startEditingShoe(shoe)}
                                      type="button"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="rounded border border-rose-300/45 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition enabled:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                      disabled={!canDelete}
                                      onClick={() => {
                                        if (shoe.id && onDeleteShoeEntry) {
                                          resetShoeEditState();
                                          setPendingDeleteId(shoe.id);
                                        }
                                      }}
                                      type="button"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-cyan-300/20 bg-black/20 px-3 py-2 text-sm text-cyan-100/80">
          No shoes match this brand filter yet.
        </p>
      )}
    </section>
  );
};

const CaloriesPanel = () => {
  const [window, setWindow] = useState('weekly');

  const filtered = useMemo(() => filterByWindow(foodLogs, window), [window]);
  const avgCalories = filtered.length
    ? filtered.reduce((sum, item) => sum + item.calories, 0) / filtered.length
    : 0;

  return (
    <section className={panelClass}>
      <h2 className="mb-1 font-display text-2xl">Calories + Food Tracker</h2>
      <p className="mb-4 text-sm text-cyan-100/80">Track calorie intake, protein, and overall quality.</p>

      <TimeWindowButtons onChange={setWindow} value={window} />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Avg Calories</p>
          <p className="text-xl font-semibold">{formatNumber(avgCalories, 0)}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Avg Protein</p>
          <p className="text-xl font-semibold">
            {formatNumber(
              filtered.length ? filtered.reduce((sum, item) => sum + item.protein, 0) / filtered.length : 0,
              0
            )}
            g
          </p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Entries</p>
          <p className="text-xl font-semibold">{filtered.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((entry) => (
          <div className="rounded-lg border border-cyan-200/15 bg-black/25 px-3 py-2" key={entry.date}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{entry.date}</p>
                <p className="text-xs text-cyan-100/75">{entry.notes}</p>
              </div>
              <div className="text-right text-sm">
                <p>{entry.calories} kcal</p>
                <p className="text-cyan-200/80">{entry.protein}g protein • {entry.quality}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const BusinessPanel = () => {
  const [window, setWindow] = useState('yearly');
  const [status, setStatus] = useState('all');

  const income = useMemo(() => filterByWindow(businessData.income, window), [window]);
  const filteredProjects = businessData.projects.filter(
    (project) => status === 'all' || project.status === status
  );

  return (
    <section className={panelClass}>
      <h2 className="mb-1 font-display text-2xl">Be Awesome Productions</h2>
      <p className="mb-4 text-sm text-cyan-100/80">Income tracking plus queued, available, and upcoming work.</p>

      <TimeWindowButtons onChange={setWindow} value={window} />

      <label className="mb-4 inline-flex items-center gap-2 text-sm">
        <span className="text-cyan-100/85">Project Status</span>
        <select
          className="rounded-lg border border-cyan-700 bg-slate-950/70 px-3 py-1.5 text-cyan-100"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="all">All</option>
          <option value="Queued">Queued</option>
          <option value="Available">Available</option>
          <option value="Upcoming">Upcoming</option>
          <option value="In Progress">In Progress</option>
        </select>
      </label>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Income Total</p>
          <p className="text-xl font-semibold text-emerald-300">
            {formatCurrency(income.reduce((sum, item) => sum + item.amount, 0))}
          </p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Projects</p>
          <p className="text-xl font-semibold">{filteredProjects.length}</p>
        </div>
        <div className={blockClass}>
          <p className="text-xs uppercase tracking-widest text-cyan-200/70">Lead Pipeline</p>
          <p className="text-xl font-semibold text-amber-200">
            {formatCurrency(businessData.leads.reduce((sum, item) => sum + item.potential, 0))}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          {filteredProjects.map((project) => (
            <div className="rounded-lg border border-cyan-200/15 bg-black/25 px-3 py-2" key={project.name}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{project.name}</p>
                <span className="rounded-full border border-cyan-200/35 px-2 py-0.5 text-xs">{project.status}</span>
              </div>
              <p className="mt-1 text-sm text-cyan-200/80">Value: {formatCurrency(project.value)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {businessData.leads.map((lead) => (
            <div className="rounded-lg border border-cyan-200/15 bg-black/25 px-3 py-2" key={lead.client}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{lead.client}</p>
                <span className="rounded-full border border-orange-200/35 px-2 py-0.5 text-xs text-orange-100">{lead.stage}</span>
              </div>
              <p className="mt-1 text-sm text-cyan-200/80">Potential: {formatCurrency(lead.potential)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CustomPanel = ({ widget }) => (
  <section className={panelClass}>
    <h2 className="mb-2 font-display text-2xl">{widget.title}</h2>
    <p className="mb-4 text-cyan-100/80">{widget.description}</p>
    <div className={blockClass}>
      <p className="mb-2 text-sm text-cyan-100/80">This custom widget is ready for your next tracker module.</p>
      <p className="text-xs uppercase tracking-widest text-cyan-200/65">
        Next step: define fields + chart/table rules for this tracker.
      </p>
    </div>
  </section>
);

export const WidgetPanels = ({
  widget,
  pokerSessions,
  hikingSessions,
  shoeCollection,
  onAddPokerSession,
  onDeletePokerSession,
  onUpdatePokerSession,
  onAddHikeSession,
  onDeleteHikeSession,
  onUpdateHikeSession,
  onAddShoeEntry,
  onDeleteShoeEntry,
  onUpdateShoeEntry
}) => {
  switch (widget.type) {
    case 'poker':
      return (
        <PokerPanel
          onAddPokerSession={onAddPokerSession}
          onDeletePokerSession={onDeletePokerSession}
          onUpdatePokerSession={onUpdatePokerSession}
          pokerSessions={pokerSessions}
        />
      );
    case 'hiking':
      return (
        <HikingPanel
          hikingSessions={hikingSessions}
          onAddHikeSession={onAddHikeSession}
          onDeleteHikeSession={onDeleteHikeSession}
          onUpdateHikeSession={onUpdateHikeSession}
        />
      );
    case 'workouts':
      return <WorkoutPanel />;
    case 'shoes':
      return (
        <ShoesPanel
          onAddShoeEntry={onAddShoeEntry}
          onDeleteShoeEntry={onDeleteShoeEntry}
          onUpdateShoeEntry={onUpdateShoeEntry}
          shoeCollection={shoeCollection}
        />
      );
    case 'calories':
      return <CaloriesPanel />;
    case 'business':
      return <BusinessPanel />;
    default:
      return <CustomPanel widget={widget} />;
  }
};

export const buildKpi = (widget, dashboardWindow, data = {}) => {
  if (widget.type === 'poker') {
    const sessions = filterByDashboardWindow(data.pokerSessions ?? pokerSessionSeed, dashboardWindow);
    const net = sessions.reduce((sum, item) => sum + item.result, 0);
    return {
      main: `${formatCurrency(net)} net`,
      sub: `${sessions.length} sessions in range`
    };
  }

  if (widget.type === 'hiking') {
    const hikes = filterByDashboardWindow(data.hikingSessions ?? hikingSessionSeed, dashboardWindow);
    const miles = hikes.reduce((sum, item) => sum + item.miles, 0);
    return {
      main: `${formatMiles(miles)}`,
      sub: `${hikes.length} hikes logged`
    };
  }

  if (widget.type === 'workouts') {
    const sessions = filterByDashboardWindow(workouts, dashboardWindow);
    const prs = sessions.filter((entry) => Boolean(entry.pr)).length;
    return {
      main: `${sessions.length} workouts`,
      sub: `${prs} PR updates`
    };
  }

  if (widget.type === 'shoes') {
    const entries = (data.shoeCollection ?? shoeSeed).map((entry, index) => normalizeShoeEntry(entry, index));
    const totalWears = entries.reduce((sum, entry) => sum + Math.max(0, entry.wearCount), 0);

    return {
      main: `${entries.length} total pairs`,
      sub: `${totalWears} total wears logged`
    };
  }

  if (widget.type === 'calories') {
    const logs = filterByDashboardWindow(foodLogs, dashboardWindow);
    const avg = logs.length ? logs.reduce((sum, item) => sum + item.calories, 0) / logs.length : 0;

    return {
      main: `${formatNumber(avg, 0)} avg calories`,
      sub: `${logs.length} nutrition entries`
    };
  }

  if (widget.type === 'business') {
    const income = filterByDashboardWindow(businessData.income, dashboardWindow);
    return {
      main: `${formatCurrency(income.reduce((sum, item) => sum + item.amount, 0))} income`,
      sub: `${businessData.projects.length} active projects`
    };
  }

  return {
    main: 'Custom tracker ready',
    sub: 'Open this widget to define your data model'
  };
};
