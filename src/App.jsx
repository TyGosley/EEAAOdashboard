import { Navigate, Route, Routes } from 'react-router-dom';
import JarvisScene from './components/JarvisScene';
import Dashboard from './components/Dashboard';
import WidgetDetail from './components/WidgetDetail';
import { buildKpi } from './components/WidgetPanels';
import { coreWidgets, createCustomWidget } from './data/defaultWidgets';
import { hikingSessions as hikingSessionSeed, pokerSessions as pokerSessionSeed } from './data/trackerData';
import { useLocalStorage } from './hooks/useLocalStorage';

const App = () => {
  const [widgets, setWidgets] = useLocalStorage('jarvis.widgets', coreWidgets);
  const [dashboardWindow, setDashboardWindow] = useLocalStorage('jarvis.dashboardWindow', 'week');
  const [pokerSessions, setPokerSessions] = useLocalStorage('jarvis.pokerSessions', pokerSessionSeed);
  const [hikingSessions, setHikingSessions] = useLocalStorage('jarvis.hikingSessions', hikingSessionSeed);

  const handleAddWidget = (name, description) => {
    setWidgets((prev) => [...prev, createCustomWidget(name, description)]);
  };

  const handleDeleteWidget = (id) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
  };

  const handleReorderWidgets = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;

    setWidgets((prev) => {
      const fromIndex = prev.findIndex((widget) => widget.id === draggedId);
      const toIndex = prev.findIndex((widget) => widget.id === targetId);

      if (fromIndex < 0 || toIndex < 0) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleResetWidgetLayout = () => {
    const coreOrder = new Map(coreWidgets.map((widget, index) => [widget.id, index]));
    const coreIds = new Set(coreWidgets.map((widget) => widget.id));

    setWidgets((prev) => {
      const core = prev
        .filter((widget) => coreIds.has(widget.id))
        .sort((a, b) => (coreOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (coreOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));
      const custom = prev.filter((widget) => !coreIds.has(widget.id));
      return [...core, ...custom];
    });
  };

  const handleAddPokerSession = ({ date, startingBankroll, result }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const session = { id, date, startingBankroll, result };

    setPokerSessions((prev) =>
      [session, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeletePokerSession = (sessionId) => {
    setPokerSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const handleUpdatePokerSession = (sessionId, updates) => {
    setPokerSessions((prev) =>
      prev
        .map((session) => (session.id === sessionId ? { ...session, ...updates } : session))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleAddHikeSession = ({ date, location, miles, durationMinutes }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const session = { id, date, location, miles, durationMinutes };

    setHikingSessions((prev) =>
      [session, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeleteHikeSession = (sessionId) => {
    setHikingSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const handleUpdateHikeSession = (sessionId, updates) => {
    setHikingSessions((prev) =>
      prev
        .map((session) => (session.id === sessionId ? { ...session, ...updates } : session))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const getWidgetKpi = (widget, window) => buildKpi(widget, window, { hikingSessions, pokerSessions });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b15] font-body text-cyan-50">
      <div className="jarvis-grid absolute inset-0" />
      <div className="jarvis-glow jarvis-glow-a" />
      <div className="jarvis-glow jarvis-glow-b" />
      <JarvisScene />

      <Routes>
        <Route
          element={
            <Dashboard
              dashboardWindow={dashboardWindow}
              getWidgetKpi={getWidgetKpi}
              onAddWidget={handleAddWidget}
              onDashboardWindowChange={setDashboardWindow}
              onDeleteWidget={handleDeleteWidget}
              onReorderWidgets={handleReorderWidgets}
              onResetWidgetLayout={handleResetWidgetLayout}
              widgets={widgets}
            />
          }
          path="/"
        />
        <Route
          element={
            <WidgetDetail
              hikingSessions={hikingSessions}
              onAddHikeSession={handleAddHikeSession}
              onAddPokerSession={handleAddPokerSession}
              onDeleteHikeSession={handleDeleteHikeSession}
              onDeletePokerSession={handleDeletePokerSession}
              onUpdatePokerSession={handleUpdatePokerSession}
              onUpdateHikeSession={handleUpdateHikeSession}
              pokerSessions={pokerSessions}
              widgets={widgets}
            />
          }
          path="/widget/:widgetId"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </div>
  );
};

export default App;
