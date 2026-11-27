import React from 'react';

interface SettingsCategoryPillProps {
  icon?: React.ReactNode;
  title: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Material 3 Expressive tonal pill heading used to categorize sections
 * across Settings hubs and sub-pages. Uses theme CSS variables so it adapts
 * cleanly across Warm Cream, Dark Olive, OLED Black, and every palette.
 */
export const SettingsCategoryPill: React.FC<SettingsCategoryPillProps> = ({
  icon,
  title,
  rightSlot,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 px-0.5 ${className}`}>
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border border-[var(--border-subtle)] shadow-2xs max-w-full">
        {icon && (
          <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 opacity-90">
            {icon}
          </span>
        )}
        <span className="text-[11px] font-black uppercase tracking-wider truncate leading-none">
          {title}
        </span>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
};
