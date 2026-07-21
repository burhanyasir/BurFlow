import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const THEMES = [
  { name: 'Indigo', primary: '#5865F2', bg: '#0B0C10', card: '#1A1B26', text: '#FFFFFF' },
  { name: 'Cyan', primary: '#00F0FF', bg: '#0B0C10', card: '#1A1B26', text: '#FFFFFF' },
  { name: 'Amber', primary: '#FFB800', bg: '#FAFAFA', card: '#FFFFFF', text: '#0B0C10' }
];

export function WidgetPreview() {
  const [themeIdx, setThemeIdx] = useState(0);
  const [simulateFallback, setSimulateFallback] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const theme = THEMES[themeIdx];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-4 flex items-center justify-center gap-3 flex-wrap">
        {THEMES.map((t, i) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setThemeIdx(i)}
            className={cn(
              'w-8 h-8 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2',
              i === themeIdx ? 'border-[#5865F2] scale-110 ring-2 ring-[#5865F2]/30' : 'border-[#D0D5DD]'
            )}
            style={{ backgroundColor: t.primary }}
            aria-label={`${t.name} theme`}
          />
        ))}
        <span className="text-xs text-[#5F6570] ml-1">Theme</span>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden transition-colors duration-500"
        style={{ backgroundColor: theme.bg }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: theme.text }}>Active now</span>
            </div>
            <button
              type="button"
              onClick={() => setShowChat(p => !p)}
              className="text-xs px-2 py-1 rounded-md transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2"
              style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
            >
              {showChat ? 'Close' : 'Open'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {simulateFallback ? (
              <motion.div
                key="fallback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl p-4 mb-3"
                style={{ backgroundColor: theme.card }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h0" />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: theme.text }}>Out of Scope</span>
                </div>
                <p className="text-xs leading-relaxed opacity-80" style={{ color: theme.text }}>
                  I&apos;m sorry, but I couldn&apos;t find an answer to that in our documentation. Please contact support directly for further assistance.
                </p>
              </motion.div>
            ) : showChat ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 mb-3"
              >
                <div className="flex justify-start">
                  <div className="rounded-xl rounded-bl-sm px-3 py-2 text-xs max-w-[80%]" style={{ backgroundColor: theme.card, color: theme.text }}>
                    Hi! How can I help you today?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-xl rounded-br-sm px-3 py-2 text-xs max-w-[80%]" style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                    What are your business hours?
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <p className="text-xs opacity-50" style={{ color: theme.text }}>
                  Widget preview
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full rounded-xl px-3 py-2 text-xs outline-none transition-colors"
              style={{ backgroundColor: theme.card, color: theme.text }}
              readOnly
            />
          </div>
        </div>

        <div
          className="h-1 transition-all duration-500"
          style={{ backgroundColor: theme.primary, opacity: 0.5 }}
        />
      </div>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setSimulateFallback(p => !p)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg border transition-colors',
            simulateFallback
              ? 'border-[#FFB800] text-[#92400E] bg-[#FFF8E0]'
              : 'border-[#D0D5DD] text-[#5F6570] hover:border-[#A0A5B0]'
          )}
        >
          {simulateFallback ? '✓ Simulating Fallback' : 'Simulate Out-of-Scope Query'}
        </button>
      </div>
    </div>
  );
}
