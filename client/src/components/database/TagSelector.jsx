import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const TagSelector = ({ value = [], onChange, placeholder = "Add tags..." }) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Common tag suggestions
    const suggestions = ['High Yield', 'Repeated', 'Important', 'Difficult', 'Easy', 'Quick Review'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tag) => {
        if (tag && !value.includes(tag)) {
            onChange([...value, tag]);
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue.trim());
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    const availableSuggestions = suggestions.filter(s => !value.includes(s));

    return (
        <div ref={containerRef} className="relative">
            <div
                className="flex flex-wrap items-center gap-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus-within:border-[var(--primary)] min-h-[38px]"
                onClick={() => inputRef.current?.focus()}
            >
                {value.map((tag, idx) => (
                    <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded text-xs font-medium"
                    >
                        {tag}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(tag);
                            }}
                            className="hover:bg-[var(--primary)]/30 rounded-full p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(e.target.value.length > 0 || availableSuggestions.length > 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(availableSuggestions.length > 0)}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
                />
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && availableSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                    {availableSuggestions
                        .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()))
                        .map((tag, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    addTag(tag);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] transition-colors text-sm"
                            >
                                {tag}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
};

export default TagSelector;
