import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { WidgetPanels } from './WidgetPanels';

const WidgetDetail = ({
  widgets,
  pokerSessions,
  hikingSessions,
  onAddPokerSession,
  onDeletePokerSession,
  onUpdatePokerSession,
  onAddHikeSession,
  onDeleteHikeSession,
  onUpdateHikeSession
}) => {
  const { widgetId } = useParams();
  const widget = widgets.find((entry) => entry.id === widgetId);

  if (!widget) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-300/40 bg-slate-900/70 p-6 text-center text-cyan-50 shadow-ember">
          <h1 className="font-display text-2xl">Widget Not Found</h1>
          <p className="mt-2 text-sm text-cyan-100/80">It may have been deleted or renamed.</p>
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-300/55 px-4 py-2 text-sm text-cyan-50"
            to="/"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative z-10 min-h-screen px-4 pb-12 pt-6 sm:px-8 lg:px-12">
      <div className="mb-5">
        <Link
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3 py-1.5 text-sm text-cyan-100 transition hover:bg-cyan-300/20"
          to="/"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <WidgetPanels
        hikingSessions={hikingSessions}
        onAddHikeSession={onAddHikeSession}
        onAddPokerSession={onAddPokerSession}
        onDeleteHikeSession={onDeleteHikeSession}
        onDeletePokerSession={onDeletePokerSession}
        onUpdatePokerSession={onUpdatePokerSession}
        onUpdateHikeSession={onUpdateHikeSession}
        pokerSessions={pokerSessions}
        widget={widget}
      />
    </main>
  );
};

export default WidgetDetail;
