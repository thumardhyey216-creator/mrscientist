import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch, placeholder = "Search topics..." }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            onSearch(query);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query, onSearch]);

    // Keyboard shortcut: Ctrl+K or / to focus
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === 'Escape' && isFocused) {
                setQuery('');
                inputRef.current?.blur();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFocused]);

    const clearSearch = () => {
        setQuery('');
        inputRef.current?.focus();
    };

    return (
        <div className={`relative flex items-center transition-all ${isFocused ? 'w-80' : 'w-64'
            }`}>
            <Search
                size={16}
                className={`absolute left-3 transition-colors ${isFocused ? 'text-[var(--primary)]' : 'text-[var(--text-tertiary)]'
                    }`}
            />
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={`w-full pl-9 pr-8 py-2 bg-[var(--bg-secondary)] border rounded-lg text-sm transition-all focus:outline-none ${isFocused
                        ? 'border-[var(--primary)] shadow-[0_0_0_2px_var(--primary-glow)]'
                        : 'border-[var(--border-subtle)]'
                    }`}
            />
            {query && (
                <button
                    onClick={clearSearch}
                    className="absolute right-2 p-1 hover:bg-[var(--bg-card-hover)] rounded"
                >
                    <X size={14} className="text-[var(--text-tertiary)]" />
                </button>
            )}
            {!query && !isFocused && (
                <kbd className="absolute right-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                    /
                </kbd>
            )}
        </div>
    );
};

export default SearchBar;
