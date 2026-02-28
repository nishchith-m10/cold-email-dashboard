'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { AskAI } from './ask-ai';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface AskAIBubbleProps {
  visible: boolean;
  onHide: () => void;
}

export function AskAIBubble({ visible, onHide }: AskAIBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHideConfirmation, setShowHideConfirmation] = useState(false);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close popup on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    // Delay to prevent the opening click from immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowHideConfirmation(true);
  }, []);

  const handleHideConfirm = () => {
    setShowHideConfirmation(false);
    setIsOpen(false);
    onHide();
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <>
      {/* Hide confirmation dialog */}
      <AnimatePresence>
        {showHideConfirmation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-[199]"
              onClick={() => setShowHideConfirmation(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-24 right-6 z-[200] w-72 rounded-xl bg-surface border border-border shadow-2xl p-4 space-y-3"
            >
              <p className="text-sm text-text-primary font-medium">Hide AI Assistant?</p>
              <p className="text-xs text-text-secondary">
                You can always re-enable the chatbot in the dashboard&apos;s <strong className="text-text-primary">Customize Dashboard</strong> settings panel (gear icon).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleHideConfirm}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-danger/10 text-accent-danger border border-accent-danger/20 hover:bg-accent-danger/20 transition-colors"
                >
                  Hide
                </button>
                <button
                  onClick={() => setShowHideConfirmation(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-elevated text-text-secondary border border-border hover:bg-surface-elevated/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Popup panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-20 right-6 z-[198] w-[420px] max-h-[min(600px,calc(100vh-8rem))] rounded-2xl bg-surface border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated/50">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md overflow-hidden">
                  <Image src="/logo.png" alt="AI" width={24} height={24} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-semibold text-text-primary">AI Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            </div>

            {/* AskAI content */}
            <div className="flex-1 overflow-y-auto">
              <AskAI compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <motion.button
        ref={bubbleRef}
        onClick={() => setIsOpen(prev => !prev)}
        onContextMenu={handleContextMenu}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
        className={cn(
          'fixed bottom-6 right-6 z-[197] h-12 w-12 rounded-full',
          'bg-accent-primary hover:bg-accent-primary/90 shadow-lg hover:shadow-xl',
          'flex items-center justify-center transition-shadow',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 focus:ring-offset-background',
          isOpen && 'ring-2 ring-accent-primary/30'
        )}
        title="AI Assistant (right-click to hide)"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <X className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <MessageCircle className="h-5 w-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>,
    document.body
  );
}
