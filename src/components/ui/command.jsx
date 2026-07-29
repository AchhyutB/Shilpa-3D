
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export default function Header({ onNavigate, onLogout }) {
  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/30 backdrop-blur-sm z-50 bg-background/80">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => onNavigate('home')}
          className="hover:opacity-80 transition-opacity"
        >
          <Image
            src="/main.png"
            alt="Shilpa3D Logo"
            width={100}
            height={50}
            priority
            className="object-contain"
          />
        </button>

        <nav className="flex items-center gap-8">
          <button
            onClick={() => onNavigate('history')}
            className="text-foreground hover:text-accent transition-colors"
          >
            History
          </button>

          <button
            onClick={onLogout}
            className="text-foreground hover:text-accent transition-colors"
          >
            Sign Out
          </button>

          <div className="flex items-center gap-2 bg-secondary/40 rounded-full px-4 py-2">
            <User size={20} className="text-accent" />
            <span className="text-foreground font-serif">Ram</span>
          </div>
        </nav>
      </div>
    </header>
  );
}