'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/header';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function ThreeDViewerPage({
  isLoggedIn,
  onLogout,
}) {
  const [model, setModel] = useState('nerf');
  const [pointSize, setPointSize] = useState(50);
  const [opacity, setOpacity] = useState(80);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const navigate = useNavigate();

  const handleDownload = () => {
    const modelData = {
      type: model.toUpperCase(),
      settings: {
        pointSize,
        opacity,
      },
      exportDate: new Date().toISOString(),
      format: 'JSON (Ready for 3D processing)',
    };

    const dataStr = JSON.stringify(modelData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shilpa3d-${model}-model-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);

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
              <div className="w-full h-[300px] sm:h-[480px] bg-border/40 border border-border/30 rounded-2xl flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <p className="text-sm text-secondary-foreground font-mono">Drag-Scroll-Pan</p>
                  </div>
                </div>
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
                  <p className="text-2xl font-mono text-accent">{model.toUpperCase()}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/30">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-mono text-muted-foreground">Point Size</label>
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
                      background: `linear-gradient(to right, #d4a574 0%, #d4a574 ${pointSize}%, #3a3328 ${pointSize}%, #3a3328 100%)`
                    }}
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-mono text-muted-foreground">Opacity</label>
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
                      background: `linear-gradient(to right, #d4a574 0%, #d4a574 ${opacity}%, #3a3328 ${opacity}%, #3a3328 100%)`
                    }}
                  />
                </div>
              </div>

              <div className="flex  gap-3 justify-end">
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
        </div>
      </main>
    </div>
  );
}