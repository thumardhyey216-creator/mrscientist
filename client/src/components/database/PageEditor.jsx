import React, { useState, useEffect } from 'react';
import { getPageBlocks } from '../../services/api';
import Block from './Block';
import { ArrowLeft } from 'lucide-react';

const PageEditor = ({ pageId, title, onClose }) => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadBlocks = async () => {
        setLoading(true);
        try {
            const data = await getPageBlocks(pageId);
            setBlocks(data);
        } catch (error) {
            console.error("Failed to load blocks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pageId) {
            loadBlocks();
        }
    }, [pageId]);

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-[var(--border-secondary)] bg-[var(--bg-app)]/90 backdrop-blur z-10 sticky top-0">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    title="Back to Database"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold truncate flex-1">{title}</h1>
            </div>

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12 md:max-w-4xl md:mx-auto w-full animate-fade-in custom-scrollbar">
                {loading ? (
                    <div className="space-y-4">
                        <div className="skeleton h-8 w-3/4 rounded"></div>
                        <div className="skeleton h-4 w-full rounded"></div>
                        <div className="skeleton h-4 w-5/6 rounded"></div>
                        <div className="skeleton h-32 w-full rounded"></div>
                    </div>
                ) : blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-tertiary)]">
                        <div className="text-4xl mb-4">📭</div>
                        <p>This page is empty.</p>
                    </div>
                ) : (
                    <div className="space-y-2 pb-20">
                        {blocks.map(block => (
                            <Block
                                key={block.id}
                                block={block}
                                onUpdate={loadBlocks} // Reload to reflect changes logic/metadata if needed, or optimistically update
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageEditor;
