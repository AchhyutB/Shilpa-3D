

import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function LandingPage({ onNavigate }) {
const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col justify-center items-center text-center px-8 min-h-[80vh]"
      >
        <img
          src="/assets/main.png"
          alt="Shilpa3D Logo"
          className="w-[600px] h-auto object-contain"
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-4"
        >
          <Button
            onClick={() => navigate('/login')}
className="bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 hover:underline hover:underline-offset-3 decoration-1.5 cursor-pointer px-8 py-6 text-lg font-bold rounded-full">
   Get Started          
</Button>
        </motion.div>
      </motion.div>

    </div>
  );
}