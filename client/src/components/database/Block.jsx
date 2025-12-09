import React, { useState } from 'react';
import { updateBlock } from '../../services/api';
import { ChevronRight, ChevronDown } from 'lucide-react';

const Block = ({ block, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // For toggles/child pages
    const [editContent, setEditContent] = useState('');

    const type = block.type;
    const content = block[type];

    // Safety check
    if (!content) return null;

    // Helper to get text from rich text array
    const getText = (richTextArray) => {
        if (!richTextArray || richTextArray.length === 0) return '';
        return richTextArray.map(rt => rt.plain_text).join('');
    };

    // Helper to get HTML from rich text (for display)
    const getHtml = (richTextArray) => {
        if (!richTextArray || richTextArray.length === 0) return '';
        return richTextArray.map(rt => {
            let text = rt.plain_text || '';
            // Basic sanitization should be done if handling user input, but this comes from API
            if (rt.annotations) {
                if (rt.annotations.bold) text = `<strong>${text}</strong>`;
                if (rt.annotations.italic) text = `<em>${text}</em>`;
                if (rt.annotations.code) text = `<code style="background: var(--bg-card); padding: 0.2rem 0.4rem; border-radius: 3px;">${text}</code>`;
                if (rt.annotations.strikethrough) text = `<del>${text}</del>`;
                if (rt.annotations.underline) text = `<u>${text}</u>`;
            }
            return text;
        }).join('');
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        if (isLoading) return;
        setEditContent(getText(content.rich_text));
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateBlock(block.id, type, editContent);
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to save block:", error);
            alert("Failed to save changes.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditContent('');
    };

    const renderEditor = () => (
        <div className="inline-editor w-full">
            <textarea
                className="w-full min-h-[80px] p-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--primary)] rounded-md font-inherit resize-y focus:outline-none"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
                <button className="btn btn-sm btn-secondary" onClick={handleCancel} disabled={isLoading}>
                    ✕ Cancel
                </button>
                <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? '⏳ Saving...' : '✓ Save'}
                </button>
            </div>
        </div>
    );

    const commonProps = {
        className: "relative group hover:bg-[var(--bg-hover)]/30 rounded px-1 transition-colors cursor-text",
        onClick: handleEdit
    };

    const EditButton = () => (
        <button
            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Edit"
            onClick={handleEdit}
        >
            ✏️
        </button>
    );

    // Block ID attribute for potential robust targeting if needed
    const blockProps = { 'data-block-id': block.id };

    if (isEditing) {
        return <div className="py-2">{renderEditor()}</div>;
    }

    switch (type) {
        case 'paragraph':
            return (
                <div {...commonProps} {...blockProps}>
                    <p className="mb-3 text-[var(--text-primary)] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'heading_1':
            return (
                <div {...commonProps} {...blockProps}>
                    <h1 className="text-3xl font-bold mt-6 mb-3 text-[var(--text-primary)]"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'heading_2':
            return (
                <div {...commonProps} {...blockProps}>
                    <h2 className="text-2xl font-bold mt-5 mb-3 text-[var(--text-primary)]"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'heading_3':
            return (
                <div {...commonProps} {...blockProps}>
                    <h3 className="text-xl font-semibold mt-4 mb-2 text-[var(--text-primary)]"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'bulleted_list_item':
            return (
                <div {...commonProps} {...blockProps} className="group relative pl-6 mb-1">
                    <div className="absolute left-2 top-2 w-1.5 h-1.5 bg-[var(--text-primary)] rounded-full opacity-70"></div>
                    <li className="list-none text-[var(--text-primary)]"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'numbered_list_item':
            return (
                <div {...commonProps} {...blockProps} className="group relative pl-6 mb-1">
                    <span className="absolute left-0 top-0 text-[var(--text-secondary)] select-none">1.</span>
                    <li className="list-none text-[var(--text-primary)]"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'quote':
            return (
                <div {...commonProps} {...blockProps}>
                    <blockquote className="border-l-4 border-[var(--primary)] pl-4 my-4 italic text-[var(--text-secondary)]"
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    <EditButton />
                </div>
            );

        case 'callout':
            const icon = content.icon?.emoji || '💡';
            return (
                <div {...commonProps} {...blockProps}>
                    <div className="flex gap-3 p-4 bg-[var(--bg-card)] rounded-lg border-l-4 border-[var(--primary)] mb-4">
                        <span className="text-xl select-none">{icon}</span>
                        <div className="text-[var(--text-primary)]"
                            dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                    </div>
                    <EditButton />
                </div>
            );

        case 'code':
            return (
                <div {...blockProps} className="mb-4 group relative">
                    <pre className="bg-[var(--bg-secondary)] p-4 rounded-lg overflow-x-auto text-sm font-mono text-[var(--text-secondary)]">
                        <code>{getText(content.rich_text)}</code>
                    </pre>
                    {/* Code block editing might involve Language selection, simplicity for now just text */}
                    <button
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-[var(--bg-card)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Edit Code"
                        onClick={handleEdit}
                    >
                        ✏️
                    </button>
                </div>
            );

        case 'to_do':
            // Checkbox logic needed
            const checked = content.checked;
            return (
                <div {...blockProps} className="flex gap-2 items-start mb-1 group relative rounded p-1 hover:bg-[var(--bg-hover)]/30">
                    <input type="checkbox" checked={checked} readOnly className="mt-1.5" />
                    <div className={`text-[var(--text-primary)] ${checked ? 'line-through text-[var(--text-muted)]' : ''}`}
                        dangerouslySetInnerHTML={{ __html: getHtml(content.rich_text) }} />
                </div>
            );

        case 'toggle':
            return (
                <div {...blockProps} className="mb-2">
                    <button
                        className="flex items-center gap-2 text-[var(--text-primary)] font-medium p-1 hover:bg-[var(--bg-hover)] rounded w-full text-left"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>{getText(content.rich_text)}</span>
                    </button>
                    {isExpanded && (
                        <div className="pl-6 mt-1 text-[var(--text-secondary)] italic">
                            {/* Recursive rendering would go here if we fetched children */}
                            (Toggle content not loaded)
                        </div>
                    )}
                </div>
            );

        case 'divider':
            return <hr className="my-6 border-[var(--border-secondary)]" />;

        case 'child_page':
            return (
                <div {...blockProps} className="mb-4 border border-[var(--border-secondary)] rounded-lg overflow-hidden">
                    <div
                        className="flex items-center gap-2 p-3 bg-[var(--bg-card)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        <span className="font-semibold">📄 {content.title || 'Untitled'}</span>
                    </div>
                    {isExpanded && (
                        <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-secondary)]">
                            {/* In a real app, this would be a recursive PageEditor or specific child content loader */}
                            <div className="text-center text-[var(--text-tertiary)] italic">
                                Child page content loading is not fully implemented in this view.
                            </div>
                        </div>
                    )}
                </div>
            );

        default:
            return <div className="py-1 text-[var(--text-tertiary)] text-xs">[Unsupported Type: {type}]</div>;
    }
};

export default Block;
