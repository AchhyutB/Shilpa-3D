'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/shared/header';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/authServices';

// Maps backend stage names (from api_spec.md) to what we show the user
const STAGE_INFO = {
  not_started: { label: 'Waiting to start…', detail: '' },
  colmap_features: { label: 'Extracting image features', detail: 'COLMAP' },
  colmap_matching: { label: 'Matching features across images', detail: 'COLMAP' },
  colmap_mapper: { label: 'Building sparse point cloud', detail: 'COLMAP' },
  nerf_convert: { label: 'Preparing NeRF dataset', detail: 'nerfstudio' },
  nerf_training: { label: 'Training NeRF model', detail: 'nerfstudio' },
  nerf_render: { label: 'Rendering NeRF views', detail: 'nerfstudio' },
  gaussian_training: { label: 'Training Gaussian Splatting model', detail: '' },
  gaussian_render: { label: 'Rendering Gaussian Splatting output', detail: '' },
  done: { label: 'Complete', detail: '' },
};

const STAGE_ORDER = [
  'not_started',
  'colmap_features',
  'colmap_matching',
  'colmap_mapper',
  'nerf_convert',
  'nerf_training',
  'nerf_render',
  'gaussian_training',
  'gaussian_render',
  'done',
];

export default function ProcessingPage({ isLoggedIn, onLogout, username }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId;

  const [stage, setStage] = useState('not_started');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');

  // No session to track — bounce back to upload
  useEffect(() => {
    if (!sessionId) {
      navigate('/home', { replace: true });
    }
  }, [sessionId, navigate]);

  // Poll /api/status/:sessionId every 5 seconds
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await authService.getStatus(sessionId);
        if (cancelled) return;
        setStage(data.stage);
        setPercent(data.percent);
      } catch (err) {
        if (!cancelled) setError('Lost connection to server. Retrying…');
      }
    };

    poll(); // fire immediately, then every 5s
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  // Navigate on to results once done
  useEffect(() => {
    if (stage === 'done') {
      const timer = setTimeout(() => {
        navigate('/results', { state: { sessionId } });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stage, sessionId, navigate]);

  const currentStageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isLoggedIn} onLogout={onLogout} username={username} />

      <main className="sm:h-[calc(100vh-9rem)] pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-6 space-y-12 flex flex-col items-center justify-center min-h-[60vh]">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-2"
          >
            <img
              src="/assets/main.png"
              alt="Shilpa3D Logo"
              className="w-100 h-auto object-contain"
            />
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full max-w-2xl space-y-2"
          >
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                animate={{ width: `${Math.min(percent, 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {Math.round(percent)}%
            </p>
          </motion.div>

          {/* Status Messages */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-background border border-border/60 rounded-2xl p-4 w-full max-w-2xl"
          >
            <div className="space-y-4 font-mono text-sm">
              {STAGE_ORDER.filter((s) => s !== 'not_started' && s !== 'done').map((s, idx) => {
                const info = STAGE_INFO[s];
                const stepIndex = STAGE_ORDER.indexOf(s);
                const isActive = currentStageIndex >= stepIndex;
                return (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                    className="text-muted-foreground"
                  >
                    <div>{info.label}</div>
                    {info.detail && <div className="text-xs mt-1">{info.detail}</div>}
                  </motion.div>
                );
              })}
            </div>

            {error && (
              <p className="text-xs text-red-500 font-mono mt-4">{error}</p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}