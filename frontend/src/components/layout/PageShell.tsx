import React from 'react';
import { motion } from 'framer-motion';
import { SlimIconSidebar } from './SlimIconSidebar';
import { containerStaggerVariants, itemFadeInVariants } from '../../utils/motion';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ title, subtitle, actions, children }) => (
  <div className="space-y-6">
    {/* Page Header matching Pinterest Quixotic styling */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>

    {/* Main Content Area with Slim Sidebar & Content Grid */}
    <div className="flex gap-6 items-start">
      {/* Slim Sidebar present across all views */}
      <SlimIconSidebar />

      {/* Main View Grid with Staggered Fade-in */}
      <motion.div
        variants={containerStaggerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 min-w-0"
      >
        {children}
      </motion.div>
    </div>
  </div>
);
