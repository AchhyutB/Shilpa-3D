'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/header';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ThreeDViewerPage({ isLoggedIn, onLogout, username }) {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, filename } = location.state || {};

  useEffect(() => {
    if (!sessionId || !filename) {
      navigate('/results', { replace: true });
      return;
    }
    if (!containerRef.current) return;

    let cancelled = false;
    const token = localStorage.getItem('accessToken');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
    const fileUrl = `${apiBase}/files/${sessionId}/${filename}`;

    const viewer = new GaussianSplats3D.Viewer({
      cameraUp: [0, -1, 0],
      initialCameraPosition: [0, 0, 3],
      initialCameraLookAt: [0, 0, 0],
      rootElement: containerRef.current,
      sharedMemoryForWorkers: false,
    });
    viewerRef.current = viewer;

    viewer
      .addSplatScene(fileUrl, {
        splatAlphaRemovalThreshold: 5,
        showLoadingUI: false,
        // fetch options so the auth token/cookie actually reach the backend
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then(() => {
        if (cancelled) return;
        viewer.start();
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setError('Failed to load model');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch (err) {
          // Library's internal DOM cleanup can race with React's own cleanup
          // (especially under React 18 Strict Mode's double-invoke in dev) —
          // safe to ignore, the container itself still gets torn down correctly.
        }
        viewerRef.current = null;
      }
    };
  }, [sessionId, filename, navigate]);

  const handleDownload = () => {
    if (!sessionId || !filename) return;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
    const token = localStorage.getItem('accessToken');

    fetch(`${apiBase}/files/${sessionId}/${filename}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={onLogout} username={username} />

      {downloadSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-28 left-1/2 transform -translate-x-1/2 w-[90vw] max-w-sm bg-accent/10 border border-accent/30 text-accent px-4 py-3 font-mono rounded-lg flex items-center gap-2 z-50 text-sm"
        >
          <CheckCircle size={18} className="shrink-0" />
          Downloaded successfully!
        </motion.div>
      )}

      <main className="sm:h-[calc(100vh-9rem)] pt-28 sm:pt-38 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => navigate('/results')}
            className="flex items-center text-sm font-mono gap-2 text-secondary-foreground hover:text-accent transition-colors mb-8"
          >
            <ChevronLeft size={20} />
            Go Back
          </motion.button>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-mono text-secondary-foreground mb-12"
          >
            3D Viewer
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="col-span-1"
            >
              <div className="w-full h-75 sm:h-120 bg-border/40 border border-border/30 rounded-2xl overflow-hidden relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-border/40">
                    <p className="text-sm text-secondary-foreground font-mono">Loading model…</p>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-border/40">
                    <p className="text-sm text-red-500 font-mono px-8 text-center">{error}</p>
                  </div>
                )}

                {/* The library renders directly into this div */}
                <div ref={containerRef} className="w-full h-full" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="bg-background border-2 border-dashed border-border/60 rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-mono text-foreground">Model</h3>
                  <p className="text-2xl font-mono text-accent">GAUSSIAN</p>
                </div>
                <p className="text-xs font-mono text-muted-foreground pt-4 border-t border-border/30">
                  Drag to rotate, scroll to zoom, right-click drag to pan.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none sm:w-40 border-foreground! font-serif text-foreground hover:bg-secondary py-6 rounded-full"
                  onClick={handleDownload}
                  disabled={loading || !!error}
                >
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none sm:w-40 border-foreground! text-foreground font-serif hover:bg-secondary py-6 rounded-full"
                  onClick={() => navigate('/home')}
                >
                  Home
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}