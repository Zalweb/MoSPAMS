import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Check } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { ACCENT_PRESETS } from '@/theme/themes';
import type { AccentColor } from '@/theme/themes';

export function ThemeCustomizer() {
  const { accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-xl border border-zinc-800/50 bg-zinc-900/50 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-300"
        title="Customize theme"
      >
        <Palette className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[280px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Accent Color</p>
                  <p className="text-xs text-zinc-500">Pick your brand color</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  {ACCENT_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => { setAccent(preset.value); }}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                          accent === preset.value
                            ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {accent === preset.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium transition-colors ${
                        accent === preset.value ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg transition-all duration-200"
                      style={{ backgroundColor: `hsl(var(--accent))` }}
                    />
                    <div>
                      <p className="text-xs text-zinc-400">Live preview</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <span
                          className="inline-block h-2 w-8 rounded-full"
                          style={{ backgroundColor: `hsl(var(--accent))` }}
                        />
                        <span
                          className="inline-block h-2 w-8 rounded-full opacity-50"
                          style={{ backgroundColor: `hsl(var(--accent))` }}
                        />
                        <span
                          className="inline-block h-2 w-8 rounded-full opacity-25"
                          style={{ backgroundColor: `hsl(var(--accent))` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
