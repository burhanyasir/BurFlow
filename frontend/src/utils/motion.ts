import { type Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export const fadeInDown: Variants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

export const fadeInLeft: Variants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

export const fadeInRight: Variants = { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

export const scaleIn: Variants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } } };

export const slideInUp: Variants = { hidden: { y: '100%' }, visible: { y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } } };

export const slideInDown: Variants = { hidden: { y: '-100%' }, visible: { y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } } };

export const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };

export const staggerItem: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export const pageTransition: Variants = { initial: { opacity: 0, y: 8 }, enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }, exit: { opacity: 0, y: -8, transition: { duration: 0.2 } } };

export const modalOverlay: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.15 } } };

export const modalContent: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }, exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } } };

export const drawerContent: Variants = { hidden: { x: '100%' }, visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }, exit: { x: '100%', transition: { duration: 0.2 } } };
