import React, { useState } from 'react';
import { X, Plus, Filter } from 'lucide-react';

const FilterPanel = ({ columns, filters, onFiltersChange, onClose }) => {
    const [localFilters, setLocalFilters] = useState(filters || []);

    // Available conditions based on column type
    const getConditions = (columnType) => {
        switch (columnType) {
            case 'text':
                return ['is', 'is not', 'contains', 'does not contain', 'is empty', 'is not empty'];
            case 'date':
                return ['is', 'is before', 'is after', 'is empty', 'is not empty'];
            case 'checkbox':
                return ['is'];
            case 'tags':
                return ['contains', 'does not contain', 'is empty', 'is not empty'];
            case 'select':
                return ['is', 'is not', 'is empty', 'is not empty'];
            default:
                return ['is', 'is not'];
        }
    };

    const addFilter = () => {
        setLocalFilters([
            ...localFilters,
            { column: columns[0]?.id || '', condition: 'is', value: '', connector: 'and' }
        ]);
    };

    const updateFilter = (index, field, value) => {
        const updated = [...localFilters];
        updated[index] = { ...updated[index], [field]: value };
        setLocalFilters(updated);
    };

    const removeFilter = (index) => {
        setLocalFilters(localFilters.filter((_, i) => i !== index));
    };

    const applyFilters = () => {
        onFiltersChange(localFilters);
        onClose();
    };

    const clearFilters = () => {
        setLocalFilters([]);
        onFiltersChange([]);
    };

    return (
        <div className="glass-card p-4 rounded-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-[var(--primary)]" />
                    <span className="font-semibold">Filters</span>
                    {localFilters.length > 0 && (
                        <span className="text-xs bg-[var(--primary)] text-white px-2 py-0.5 rounded-full">
                            {localFilters.length}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                    <X size={18} />
                </button>
            </div>

            <div className="space-y-2">
                {localFilters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2">
                        {index > 0 && (
                            <select
                                value={filter.connector}
                                onChange={(e) => updateFilter(index, 'connector', e.target.value)}
                                className="px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs font-medium w-16"
                            >
                                <option value="and">AND</option>
                                <option value="or">OR</option>
                            </select>
                        )}

                        <select
                            value={filter.column}
                            onChange={(e) => updateFilter(index, 'column', e.target.value)}
                            className="px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs flex-1"
                        >
                            {columns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>

                        <select
                            value={filter.condition}
                            onChange={(e) => updateFilter(index, 'condition', e.target.value)}
                            className="px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs"
                        >
                            {getConditions(columns.find(c => c.id === filter.column)?.type).map(cond => (
                                <option key={cond} value={cond}>{cond}</option>
                            ))}
                        </select>

                        {!['is empty', 'is not empty'].includes(filter.condition) && (
                            <input
                                type="text"
                                value={filter.value}
                                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                placeholder="Value..."
                                className="px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs flex-1"
                            />
                        )}

                        <button
                            onClick={() => removeFilter(index)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <button
                    onClick={addFilter}
                    className="flex items-center gap-1 text-sm text-[var(--primary)] hover:text-[var(--primary-hover)]"
                >
                    <Plus size={14} />
                    Add filter
                </button>

                <div className="flex items-center gap-2">
                    {localFilters.length > 0 && (
                        <button
                            onClick={clearFilters}
                            className="btn btn-secondary btn-sm"
                        >
                            Clear all
                        </button>
                    )}
                    <button
                        onClick={applyFilters}
                        className="btn btn-primary btn-sm"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
