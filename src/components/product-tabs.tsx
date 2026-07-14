'use client';

import {useRef, useState, KeyboardEvent} from 'react';

export type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function ProductTabs({tabs}: {tabs: Tab[]}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const clamped = Math.max(0, Math.min(index, tabs.length - 1));
    setActiveIndex(clamped);
    tabRefs.current[clamped]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusTab(activeIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusTab(activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusTab(0);
        break;
      case 'End':
        e.preventDefault();
        focusTab(tabs.length - 1);
        break;
    }
  };

  return (
    <section className="product-details-tabs">
      <nav role="tablist" aria-label="Product details">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[index] = el; }}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
              onKeyDown={handleKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== activeIndex}
        >
          {index === activeIndex && tab.content}
        </div>
      ))}
    </section>
  );
}