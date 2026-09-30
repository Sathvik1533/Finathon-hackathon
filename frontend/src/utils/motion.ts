import type { Transition, Variants } from 'framer-motion';

// Canonical easing and spring tokens from /Users/k.sathvik/DESIGN-BIBLE.md & INTERACTION-PATTERNS.md
export const CANONICAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SPRING_FAST: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 17,
};

export const SPRING_SMOOTH: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
};

// Check for reduced motion preference
export const isReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Page entrance transition
export const pageMotionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: CANONICAL_EASE,
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
};

// Stagger container for card grids
export const containerStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

// Card or item element reveal
export const itemFadeInVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: CANONICAL_EASE,
    },
  },
};

// Interactive button spring states (matches INTERACTION-PATTERNS.md Part 2 / 5)
export const buttonPressProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: SPRING_FAST,
};

// Interactive card hover states (elevation lift)
export const cardHoverProps = {
  whileHover: {
    y: -2,
    transition: { duration: 0.2, ease: CANONICAL_EASE },
  },
};

// Badge spring arrival
export const badgeArrivalVariants: Variants = {
  initial: { scale: 0.7, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: SPRING_FAST,
  },
};
