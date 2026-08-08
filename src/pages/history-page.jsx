'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/shared/header';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/authServices';

const STAGE_LABELS = {
  not_started: 'Not started',
  colmap_features: 'Processing…',
  colmap_matching: 'Processing…',
  colmap_mapper: 'Processing…',
  nerf_convert: 'Processing…',
  nerf_training: 'Processing…',
  nerf_render: 'Processing…',
  gaussian_training: 'Processing…',
  gaussian_render: 'Processing…',
  done: 'Complete',
};

export default function HistoryPage({ onNavigate, isLoggedIn, onLogout, username }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authService
      .getHistory()
      .then((data) => setSessions(data.sessions || []))
      .catch((err) => setError(err.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const openSession = (session) => {
    if (session.stage === 'done') {
      navigate('/results', { state: { sessionId: session.session_id } });
    } else {
      navigate('/processing', { state: { sessionId: session.session_id } });
    }
  };

  const formatDate = (iso) => {
    if (!iso) return 'Unknown date';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={onNavigate} onLogout={onLogout} username={username} />

      <main className="pt-28 pb-12">
        <div className="max-w-5xl mx-auto px-6 space-y-8">

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-mono text-foreground"
          >
            History
          </motion.h1>

          {loading && (
            <p className="font-mono text-muted-foreground text-center py-12">Loading your uploads…</p>
          )}

          {!loading && error && (
            <p className="font-mono text-red-500 text-center py-12">{error}</p>
          )}

          {!loading && !error && sessions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-16 space-y-4"
            >
              <p className="font-mono text-muted-foreground">You haven't uploaded anything yet.</p>
              <Button
                onClick={() => navigate('/home')}
                className="bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 px-8 py-6 font-serif rounded-full"
              >
                Upload Your First Statue
              </Button>
            </motion.div>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div className="space-y-4">
              {sessions.map((session, idx) => (
                <motion.button
                  key={session.session_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  onClick={() => openSession(session)}
                  className="w-full text-left bg-card-foreground border border-border/30 rounded-2xl p-6 flex items-center justify-between gap-4 hover:border-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg text-background">
                      {session.statue || 'Untitled statue'}
                    </h3>
                    <p className="text-xs font-mono text-muted">
                      {formatDate(session.created_at)}
                      {session.method && ` · ${session.method.toUpperCase()}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-mono px-3 py-1 rounded-full ${
                        session.stage === 'done'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-secondary/40 text-muted-foreground'
                      }`}
                    >
                      {STAGE_LABELS[session.stage] || session.stage}
                    </span>
                    {session.stage !== 'done' && session.stage !== 'not_started' && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {Math.round(session.percent)}%
                      </p>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}