'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type SearchableSelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length, search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-option]');
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    setHighlightedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger / Display */}
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="w-full flex items-center justify-between px-2 py-1 text-[11px] border rounded bg-gray-50 hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-left truncate transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={selectedOption ? 'text-gray-800' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg className="w-3 h-3 ml-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <div className="w-full flex items-center border rounded bg-white ring-1 ring-indigo-400 border-indigo-400">
          <svg className="w-3 h-3 ml-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search..."
            className="w-full px-2 py-1 text-[11px] bg-transparent outline-none"
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full min-w-[300px] max-h-[240px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-400 italic">No results found</div>
          ) : (
            filtered.map((option, idx) => (
              <div
                key={option.value}
                data-option
                onClick={() => handleSelect(option.value)}
                className={`px-3 py-1.5 cursor-pointer text-[11px] transition-colors ${
                  idx === highlightedIndex
                    ? 'bg-indigo-50 text-indigo-900'
                    : option.value === value
                    ? 'bg-gray-50 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium truncate">{option.label}</div>
                {option.sublabel && (
                  <div className="text-[10px] text-gray-400 truncate">{option.sublabel}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
