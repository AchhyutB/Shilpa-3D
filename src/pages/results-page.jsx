'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/header';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function ResultsPage({
  isLoggedIn,
  onLogout,
}) {
  const [exportSuccess, setExportSuccess] = useState(false);
  const navigate = useNavigate();

  const handleExportReport = () => {
    const reportData = {
      exportDate: new Date().toISOString(),
      project: 'Shilpa3D Reconstruction',
      results: {
        nerf: {
          name: 'NeRF Output',
          metrics: {
            psnr: '29.4',
            ssim: '0.91',
            processingTime: '80 MIN',
          },
        },
        gaussian: {
          name: 'Gaussian Splatting Output',
          metrics: {
            psnr: '28.1',
            ssim: '0.89',
            processingTime: '18 MIN',
          },
        },
      },
    };

    const reportJson = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shilpa3d-report-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        navigate={navigate}
        onLogout={onLogout}
      />

      <main className="sm:h-[calc(100vh-9rem)] pt-22 pb-12">
        {/* Back button */}
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

        {/* Success notification */}
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

          {/* Results Grid — stacks on mobile, side-by-side on lg */}
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

              {/* Viewer box — full width, fixed aspect ratio */}
              <div className="w-full aspect-[4/3] bg-secondary/40 border border-border/30 rounded-xl flex items-center justify-center" />

              <div className="grid grid-cols-3 text-center text-xs sm:text-sm">
                <div className="text-accent font-mono">
                  <p>PSNR 29.4</p>
                </div>
                <div className="text-accent font-mono">
                  <p>SSIM 0.91</p>
                </div>
                <div className="text-foreground font-mono">
                  <p>Time 80 MIN</p>
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

              {/* Viewer box — full width, fixed aspect ratio */}
              <div className="w-full aspect-[4/3] bg-secondary/40 border border-border/30 rounded-xl flex items-center justify-center" />

              <div className="grid grid-cols-3 text-center text-xs sm:text-sm">
                <div className="text-accent font-mono">
                  <p>PSNR 28.1</p>
                </div>
                <div className="text-accent font-mono">
                  <p>SSIM 0.89</p>
                </div>
                <div className="text-foreground font-mono">
                  <p>Time 18 MIN</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
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
            >
              Export Report
            </Button>

            <Button
              onClick={() => navigate('/3d-viewer')}
              className="w-full sm:w-auto bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 px-8 py-6 font-serif rounded-full"
            >
              Open 3D Viewer
            </Button>
          </motion.div>

        </div>
      </main>
    </div>
  );
}