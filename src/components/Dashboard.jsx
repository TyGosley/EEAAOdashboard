import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { dashboardWindows } from '../utils/filters';

const Dashboard = ({
  widgets,
  dashboardWindow,
  onDashboardWindowChange,
  onAddWidget,
  onDeleteWidget,
  onReorderWidgets,
  onResetWidgetLayout,
  getWidgetKpi
}) => {
  const [draggedWidgetId, setDraggedWidgetId] = useState(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState(null);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const getStandaloneStatus = () =>
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsStandalone(true);
    };

    setIsStandalone(getStandaloneStatus());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => setIsStandalone(getStandaloneStatus());

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);

      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!draggedWidgetId) return;

    const handleTouchMove = (event) => {
      if (event.cancelable) event.preventDefault();

      const touch = event.touches[0];
      if (!touch) return;

      const hovered = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetCard = hovered?.closest?.('[data-widget-id]');
      const targetWidgetId = targetCard?.getAttribute('data-widget-id');

      if (!targetWidgetId || targetWidgetId === draggedWidgetId) {
        setDragOverWidgetId(null);
        return;
      }

      if (targetWidgetId !== dragOverWidgetId) {
        setDragOverWidgetId(targetWidgetId);
      }
    };

    const handleTouchEnd = () => {
      if (draggedWidgetId && dragOverWidgetId && draggedWidgetId !== dragOverWidgetId && onReorderWidgets) {
        onReorderWidgets(draggedWidgetId, dragOverWidgetId);
      }

      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [draggedWidgetId, dragOverWidgetId, onReorderWidgets]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name')?.toString().trim();
    const description = formData.get('description')?.toString().trim();

    if (!name) return;

    onAddWidget(name, description);
    form.reset();
  };

  const handleDragStart = (event, widgetId) => {
    setDraggedWidgetId(widgetId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', widgetId);
  };

  const handleDragOver = (event, widgetId) => {
    event.preventDefault();
    if (dragOverWidgetId !== widgetId) setDragOverWidgetId(widgetId);
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event, targetWidgetId) => {
    event.preventDefault();

    const droppedId = event.dataTransfer.getData('text/plain') || draggedWidgetId;
    if (droppedId && onReorderWidgets) {
      onReorderWidgets(droppedId, targetWidgetId);
    }

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleTouchStart = (event, widgetId) => {
    if (event.cancelable) event.preventDefault();
    setDraggedWidgetId(widgetId);
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;

    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } finally {
      setInstallPromptEvent(null);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col px-4 pb-12 pt-6 sm:px-8 lg:px-12">
      <header className="mb-7 flex flex-col gap-6 rounded-2xl border border-cyan-400/30 bg-panel/55 p-5 shadow-neon backdrop-blur-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/90">Personal Command Center</p>
          <h1 className="font-display text-4xl font-semibold text-cyan-50">Jarvis Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-cyan-100/80">
            Track your key life systems in one modular PWA. Click any widget to expand into detailed views.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onResetWidgetLayout ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/70 bg-cyan-950/45 px-3 py-1.5 text-xs tracking-wide text-cyan-100 transition hover:border-cyan-300/90"
              onClick={onResetWidgetLayout}
              type="button"
            >
              <RotateCcw size={13} /> Reset Layout
            </button>
          ) : null}
          {!isStandalone && installPromptEvent ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/70 bg-emerald-500/15 px-3 py-1.5 text-xs tracking-wide text-emerald-100 transition hover:border-emerald-300/90 hover:bg-emerald-500/25"
              onClick={handleInstallApp}
              type="button"
            >
              <Download size={13} /> Install App
            </button>
          ) : null}
          {Object.entries(dashboardWindows).map(([key, label]) => (
            <button
              className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition ${
                dashboardWindow === key
                  ? 'border-cyan-300 bg-cyan-300/20 text-cyan-50'
                  : 'border-cyan-700/60 bg-slate-900/60 text-cyan-200 hover:border-cyan-400/80'
              }`}
              key={key}
              onClick={() => onDashboardWindowChange(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="mb-7 rounded-2xl border border-orange-300/35 bg-slate-900/55 p-5 shadow-ember backdrop-blur-sm">
        <h2 className="mb-3 font-display text-xl text-orange-100">Add Custom Widget</h2>
        <form className="grid gap-3 md:grid-cols-[1fr_2fr_auto]" onSubmit={handleSubmit}>
          <input
            className="rounded-xl border border-cyan-900/80 bg-slate-950/70 px-3 py-2 text-sm text-cyan-100 outline-none ring-cyan-300/50 transition focus:ring"
            name="name"
            placeholder="Widget name"
            required
            type="text"
          />
          <input
            className="rounded-xl border border-cyan-900/80 bg-slate-950/70 px-3 py-2 text-sm text-cyan-100 outline-none ring-cyan-300/50 transition focus:ring"
            name="description"
            placeholder="What do you want to track here?"
            type="text"
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300/60 bg-orange-300/15 px-4 py-2 text-sm font-medium text-orange-100 transition hover:bg-orange-300/25"
            type="submit"
          >
            <Plus size={16} /> Add
          </button>
        </form>
      </section>

      <p className="mb-3 text-xs uppercase tracking-widest text-cyan-200/70">
        Tip: drag using the grip handle in each card.
      </p>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {widgets.map((widget) => {
          const kpi = getWidgetKpi(widget, dashboardWindow);
          const isDragTarget = dragOverWidgetId === widget.id && draggedWidgetId !== widget.id;
          const isDragging = draggedWidgetId === widget.id;

          return (
            <article
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${widget.accent} p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 ${
                isDragTarget ? 'border-cyan-200/85 ring-2 ring-cyan-300/60' : 'border-cyan-500/25 hover:border-cyan-300/65'
              } ${isDragging ? 'opacity-45' : ''}`}
              data-widget-id={widget.id}
              onDragOver={(event) => handleDragOver(event, widget.id)}
              onDrop={(event) => handleDrop(event, widget.id)}
              key={widget.id}
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full border border-cyan-100/15" />
              <div className="absolute -left-6 bottom-5 h-11 w-11 rounded-full border border-cyan-100/15" />

              <div className="relative z-10">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl font-semibold text-white">{widget.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`Drag ${widget.title}`}
                      className="touch-none cursor-grab rounded-md border border-cyan-200/45 bg-cyan-300/10 p-1.5 text-cyan-100 transition hover:bg-cyan-300/20 active:cursor-grabbing"
                      draggable
                      onDragEnd={handleDragEnd}
                      onDragStart={(event) => handleDragStart(event, widget.id)}
                      onTouchStart={(event) => handleTouchStart(event, widget.id)}
                      type="button"
                    >
                      <GripVertical size={14} />
                    </button>
                    <button
                      aria-label={`Delete ${widget.title}`}
                      className="rounded-md border border-rose-200/40 bg-rose-400/10 p-1.5 text-rose-100/90 transition hover:bg-rose-400/25"
                      onClick={(event) => {
                        event.preventDefault();
                        onDeleteWidget(widget.id);
                      }}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="mb-5 text-sm text-cyan-50/90">{widget.description}</p>

                <div className="mb-5 rounded-xl border border-cyan-100/20 bg-slate-950/45 p-3">
                  <p className="text-xs uppercase tracking-widest text-cyan-200/70">Highlight</p>
                  <p className="mt-1 text-lg font-semibold text-white">{kpi.main}</p>
                  <p className="text-xs text-cyan-100/85">{kpi.sub}</p>
                </div>

                <Link
                  className="inline-flex rounded-lg border border-cyan-200/50 bg-cyan-300/10 px-3 py-1.5 text-sm text-cyan-100 transition hover:bg-cyan-300/20"
                  to={`/widget/${widget.id}`}
                >
                  Open Widget
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default Dashboard;
