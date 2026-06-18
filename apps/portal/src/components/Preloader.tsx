import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export const Preloader = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[999] bg-white flex items-center justify-center text-black"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">DEV.PORTAL</h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.5, duration: 1.5, ease: 'easeInOut' }}
              className="h-px bg-black/20 w-32"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
