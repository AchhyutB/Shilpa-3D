'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/header';
import { ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Splat } from '@react-three/drei';
import { getJobModels, getJobStatus } from '@/lib/api';

export default function ThreeDViewerPage({ isLoggedIn, onLogout }) {
  const [model, setModel] = useState('gaussian'); // 'gaussian' | 'nerf'
  const [pointSize, setPointSize] = useState(50);
  const [opacity, setOpacity] = useState(80);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [models, setModels] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();
  const { jobId } = useParams(); // route must be /3d-viewer/:jobId

  useEffect(() => {
    if (!jobId) {
      setLoadError('No job ID found.');
      return;
    }

    let cancelled = false;
    setLoadError(null);

    async function load() {
      try {
        // Guard against landing here (e.g. a bookmark) before the job
        // actually finished processing.
        const status = await getJobStatus(jobId);
        if (cancelled) return;

        if (status.status === 'failed') {
          setLoadError('This job failed during processing.');
          return;
        }

        if (status.status !== 'complete') {
          navigate(`/processing/${jobId}`);
          return;
        }

        const data = await getJobModels(jobId);
        if (!cancelled) setModels(data);
      } catch (err) {
        if (!cancelled) setLoadError('Could not load 3D models for this job.');
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [jobId, navigate, retryKey]);

  const activeModel = models?.[model]; // { type: 'splat'|'video', url }
  const isSplat = activeModel?.type === 'splat';
  const isVideo = activeModel?.type === 'video';

  const handleDownload = () => {
    if (!activeModel?.url) return;

    const link = document.createElement('a');
    link.href = activeModel.url;
    link.download = `shilpa3d-${model}-model-${new Date().getTime()}${
      isSplat ? '.splat' : '.mp4'
    }`;
    link.click();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header navigate={navigate} onLogout={onLogout} />

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
            onClick={() => navigate(`/results/${jobId}`)}
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

          {loadError ? (
            <div className="text-center space-y-3">
              <p className="font-mono text-destructive">{loadError}</p>
              <button
                onClick={() => setRetryKey((k) => k + 1)}
                className="underline text-sm font-mono text-muted-foreground hover:text-accent"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="col-span-1"
              >
                <div className="w-full h-[300px] sm:h-[480px] bg-border/40 border border-border/30 rounded-2xl overflow-hidden relative">
                  {!activeModel && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                  )}

                  {isSplat && (
                    <Canvas
                      camera={{ position: [0, 0, 5], fov: 50 }}
                      style={{ opacity: opacity / 100 }}
                      className="!bg-transparent"
                    >
                      <ambientLight intensity={1} />
                      <Splat src={activeModel.url} scale={pointSize / 50} />
                      <OrbitControls makeDefault />
                    </Canvas>
                  )}

                  {isVideo && (
                    <video
                      className="w-full h-full object-cover"
                      style={{ opacity: opacity / 100 }}
                      src={activeModel.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                    />
                  )}

                  {activeModel && (
                    <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-secondary-foreground font-mono pointer-events-none">
                      {isSplat ? 'Drag-Scroll-Pan' : 'Pre-rendered orbit'}
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <div className="bg-background border border-2 border-dashed border-border/60 rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-mono text-foreground">Model</h3>
                    <p className="text-2xl font-mono text-accent">
                      {model === 'nerf' ? 'NeRF' : 'GAUSSIAN'}
                    </p>
                  </div>

                  {/* Point size only affects the splat renderer */}
                  {isSplat && (
                    <div className="space-y-3 pt-4 border-t border-border/30">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-mono text-muted-foreground">
                          Point Size
                        </label>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={pointSize}
                        onChange={(e) => setPointSize(Number(e.target.value))}
                        className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                        style={{
                          background: `linear-gradient(to right, #d4a574 0%, #d4a574 ${pointSize}%, #3a3328 ${pointSize}%, #3a3328 100%)`,
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-3 pt-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-mono text-muted-foreground">
                        Opacity
                      </label>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                      style={{
                        background: `linear-gradient(to right, #d4a574 0%, #d4a574 ${opacity}%, #3a3328 ${opacity}%, #3a3328 100%)`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => setModel(model === 'nerf' ? 'gaussian' : 'nerf')}
                    className="flex-1 sm:flex-none sm:w-50 bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 px-8 py-6 text-sm font-medium font-serif rounded-full"
                  >
                    {model === 'nerf' ? 'Switch to Gaussian' : 'Switch to NeRF'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none sm:w-40 !border-foreground font-serif text-foreground hover:bg-secondary py-6 rounded-full"
                    onClick={handleDownload}
                    disabled={!activeModel}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none sm:w-40 !border-foreground text-foreground font-serif hover:bg-secondary py-6 rounded-full"
                    onClick={() => navigate('/home')}
                  >
                    Home
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}