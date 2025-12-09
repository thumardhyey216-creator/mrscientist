import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

// Color palette for select options
const COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Gray', value: '#6b7280' }
];

const SelectEditor = ({ value, options = [], onChange, onOptionsChange, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newOption, setNewOption] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleAddOption = () => {
        if (!newOption.trim()) return;

        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        const newOpt = {
            value: newOption.trim(),
            label: newOption.trim(),
            color: randomColor.value
        };

        onOptionsChange([...options, newOpt]);
        onChange(newOpt.value);
        setNewOption('');
        setIsOpen(false);
    };

    const handleRemoveOption = (e, optionValue) => {
        e.stopPropagation();
        onOptionsChange(options.filter(opt => opt.value !== optionValue));
        if (value === optionValue) onChange(null);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs hover:border-[var(--primary)] transition-colors"
            >
                {selectedOption ? (
                    <span
                        className="px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: selectedOption.color + '30',
                            color: selectedOption.color
                        }}
                    >
                        {selectedOption.label}
                    </span>
                ) : (
                    <span className="text-[var(--text-tertiary)]">{placeholder}</span>
                )}
                <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl overflow-hidden animate-fade-in">
                    <div className="max-h-48 overflow-y-auto">
                        {options.map(option => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-secondary)] cursor-pointer group"
                            >
                                <span
                                    className="px-2 py-0.5 rounded text-xs"
                                    style={{
                                        backgroundColor: option.color + '30',
                                        color: option.color
                                    }}
                                >
                                    {option.label}
                                </span>
                                <button
                                    onClick={(e) => handleRemoveOption(e, option.value)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded"
                                >
                                    <X size={12} className="text-red-400" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-[var(--border-subtle)] p-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                placeholder="Add option..."
                                className="flex-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)]"
                            />
                            <button
                                onClick={handleAddOption}
                                className="px-2 py-1 bg-[var(--primary)] text-white rounded text-xs"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SelectEditor;
