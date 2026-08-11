'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/header';
import { CheckCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJobResults, getJobStatus } from '@/lib/api';

function PreviewBox({ result }) {
  if (!result) {
    return (
      <div className="w-full aspect-[4/3] bg-secondary/40 border border-border/30 rounded-xl flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (result.previewType === 'video') {
    return (
      <video
        className="w-full aspect-[4/3] bg-secondary/40 border border-border/30 rounded-xl object-cover"
        src={result.previewUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  // Falls back to a static image preview if previewType === 'image'
  return (
    <img
      className="w-full aspect-[4/3] bg-secondary/40 border border-border/30 rounded-xl object-cover"
      src={result.previewUrl}
      alt={result.name}
    />
  );
}

export default function ResultsPage({ isLoggedIn, onLogout }) {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [results, setResults] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();
  const { jobId } = useParams(); // route must be /results/:jobId

  useEffect(() => {
    if (!jobId) {
      setLoadError('No job ID found.');
      return;
    }

    let cancelled = false;
    setLoadError(null);

    async function load() {
      try {
        // Someone could land here via a bookmark or a stale link before
        // the job is actually done — check first instead of assuming.
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

        const data = await getJobResults(jobId);
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) setLoadError('Could not load results for this job.');
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [jobId, navigate, retryKey]);

  const handleExportReport = () => {
    if (!results) return;

    const reportData = {
      exportDate: new Date().toISOString(),
      project: 'Shilpa3D Reconstruction',
      jobId,
      results,
    };

    const reportJson = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shilpa3d-report-${jobId}-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header navigate={navigate} onLogout={onLogout} />

      <main className="sm:h-[calc(100vh-9rem)] pt-22 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 my-6 sm:my-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => navigate('/home')}
            className="flex items-center text-sm font-mono gap-2 text-secondary-foreground hover:text-accent transition-colors"
          >
            <ChevronLeft size={20} />
            Go Back
          </motion.button>
        </div>

        {exportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm bg-accent/10 border border-accent/30 text-accent font-mono px-4 py-3 rounded-lg flex items-center gap-2 z-50 text-sm"
          >
            <CheckCircle size={18} className="shrink-0" />
            Report exported successfully!
          </motion.div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-10 sm:space-y-16">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-32">
              {/* NeRF Output */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-xl sm:text-2xl font-mono text-foreground">
                  NeRF Output
                </h2>

                <PreviewBox result={results?.nerf} />

                <div className="grid grid-cols-3 text-center text-xs sm:text-sm">
                  <div className="text-accent font-mono">
                    <p>PSNR {results?.nerf?.psnr ?? '--'}</p>
                  </div>
                  <div className="text-accent font-mono">
                    <p>SSIM {results?.nerf?.ssim ?? '--'}</p>
                  </div>
                  <div className="text-foreground font-mono">
                    <p>Time {results?.nerf?.processingTime ?? '--'}</p>
                  </div>
                </div>
              </motion.div>

              {/* Gaussian Output */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-xl sm:text-2xl font-mono text-foreground lg:text-right">
                  Gaussian Output
                </h2>

                <PreviewBox result={results?.gaussian} />

                <div className="grid grid-cols-3 text-center text-xs sm:text-sm">
                  <div className="text-accent font-mono">
                    <p>PSNR {results?.gaussian?.psnr ?? '--'}</p>
                  </div>
                  <div className="text-accent font-mono">
                    <p>SSIM {results?.gaussian?.ssim ?? '--'}</p>
                  </div>
                  <div className="text-foreground font-mono">
                    <p>Time {results?.gaussian?.processingTime ?? '--'}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-8 sm:mt-12"
          >
            <Button
              variant="outline"
              className="w-full sm:w-auto font-serif !border-foreground text-foreground hover:bg-secondary px-8 py-6 rounded-full"
              onClick={handleExportReport}
              disabled={!results}
            >
              Export Report
            </Button>

            <Button
              onClick={() => navigate(`/3d-viewer/${jobId}`)}
              className="w-full sm:w-auto bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 px-8 py-6 font-serif rounded-full"
              disabled={!results}
            >
              Open 3D Viewer
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}