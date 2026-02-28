/**
 * SignOutTransition - Loading overlay during sign out
 * 
 * Shows a smooth transition animation when the user signs out
 * to prevent the jarring static screen experience.
 * Theme-aware: matches current dark/light mode.
 */

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/hooks/use-theme';

interface SignOutTransitionProps {
  isVisible: boolean;
}

export function SignOutTransition({ isVisible }: SignOutTransitionProps) {
  const { theme } = useTheme();
  if (!isVisible) return null;

  const isLight = theme === 'light';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${
        isLight
          ? 'bg-gradient-to-br from-slate-100 via-white to-slate-100'
          : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
      }`}
    >
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-2xl mb-6">
          <Image src="/logo.png" alt="Logo" width={80} height={80} className="w-full h-full object-cover" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className={`text-xl md:text-2xl font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Signing out...</h2>
          <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>See you next time!</p>
        </motion.div>

        {/* Loading spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
            isLight ? 'border-slate-300 border-t-blue-600' : 'border-slate-600 border-t-blue-500'
          }`} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
