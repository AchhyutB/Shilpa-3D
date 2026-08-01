'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/shared/header';
import { useNavigate } from 'react-router-dom';

const stages = [
  {
    name: '24 images loaded......',
    detail: 'COLMAP',
  },
  {
    name: '3,412 sparse point',
    detail: 'NeRF iter 55241 | loss : 0.0043',
  },
  {
    name: 'Gaussian Splatting queued',
    detail: '',
  },
];

export default function ProcessingPage({
  isLoggedIn,
  onLogout,
}) {
  const navigate = useNavigate();

  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  // Stage progression
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) =>
        prev < stages.length - 1 ? prev + 1 : prev
      );
    }, 3000);

    return () => clearInterval(stageInterval);
  }, []);

  // Progress animation
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(prev + 5 + Math.random() * 10, 100);
      });
    }, 500);

    return () => clearInterval(progressInterval);
  }, []);

  // Navigate when done
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        navigate('/results');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [progress, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        onLogout={onLogout}
      />

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
                animate={{
                  width: `${Math.min(progress, 100)}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {Math.round(progress)}%
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
              {stages.map((stage, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: currentStage >= idx ? 1 : 0.3,
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-muted-foreground"
                >
                  <div>{stage.name}</div>

                  {stage.detail && (
                    <div className="text-xs mt-1">
                      {stage.detail}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}