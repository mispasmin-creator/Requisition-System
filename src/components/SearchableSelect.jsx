import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export function SearchableSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  required = false,
  disabled = false,
  error = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filtered = options.filter((opt) =>
    (opt || '').toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    setActiveIndex(-1);
    setSearchTerm('');
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filtered.length) {
      e.preventDefault();
      onChange(filtered[activeIndex]);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label} {required && <span style={{ color: '#c0392b' }}>*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: disabled ? 'var(--surface-subtle)' : '#ffffff',
          border: error ? '1.5px solid #d9534f' : '1px solid var(--border-light)',
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: 'var(--shadow-card)',
          transition: 'border-color 0.15s ease',
          outline: 'none',
        }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.92rem' }}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </div>

      {error && <span style={{ fontSize: '0.78rem', color: '#c0392b', fontWeight: 500 }}>{error}</span>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '6px',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-dropdown)',
            border: '1px solid var(--border-light)',
            zIndex: 1000,
            padding: '8px',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search box inside dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: '8px',
              marginBottom: '6px',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No options match
              </div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt === value;
                const isHighlighted = idx === activeIndex;
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'var(--accent-mint-light)'
                        : isHighlighted
                        ? 'var(--surface-subtle)'
                        : 'transparent',
                      color: isSelected ? 'var(--accent-sage-dark)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={14} color="var(--accent-sage-dark)" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
