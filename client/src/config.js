/**
 * Notion API Configuration
 * Contains API credentials and database information
 */

export const CONFIG = {
    // Data source: 'notion' | 'supabase' | 'hybrid'
    // 'notion' - Use Notion API only (original behavior)
    // 'supabase' - Use Supabase only
    // 'hybrid' - Use Supabase with Notion sync
    DATA_SOURCE: 'supabase',

    // Supabase Configuration
    // Get your anon key from: https://app.supabase.com/project/nqpfjsduwxyrwclpssig/settings/api
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://nqpfjsduwxyrwclpssig.supabase.co',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcGZqc2R1d3h5cndjbHBzc2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTc0NDYsImV4cCI6MjA4MDc5MzQ0Nn0.T3Ejz23t9P8lvIp2b_V9q4RJyATmThJWCbmWV1XeHFA',

    // Notion API credentials
    NOTION_TOKEN: import.meta.env.VITE_NOTION_TOKEN,
    NOTION_VERSION: '2022-06-28',

    // Database ID
    DATABASE_ID: import.meta.env.VITE_DATABASE_ID || '2a5f4430-e9de-80cc-972d-db67262ba456',

    // API endpoints
    API_BASE_URL: '/api/notion',

    // Cache settings
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
    AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // Auto-sync every 5 minutes

    // Pagination
    PAGE_SIZE: 100,

    // Subject category color mapping
    SUBJECT_COLORS: {
        // Surgery
        'General Surgery': '#ffd43b',
        'Neurosurgery': '#ff6b6b',
        'Urology': '#ff6b6b',
        'GASTROINTESTINAL TRACT (Surgery)': '#9f7aea',

        // Gynecology & Obstetrics
        'General Gynaecology': '#339af0',
        'GYNAEC INFECTIONS': '#868e96',
        'GYNAEC ONCOLOGY': '#51cf66',
        'OBSTETRIC COMPLICATIONS': '#ff6b6b',

        // Pathology
        'GENERAL PATHOLOGY': '#51cf66',
        'HAEMATOLOGY (Pathology List)': '#9f7aea',

        // Pharmacology
        'GENERAL PHARMACOLOGY': '#339af0',
        'ANTIMICROBIALS (Pharmacology)': '#51cf66',
        'CVS PHARMACOLOGY': '#9f7aea',
        'CNS PHARMACOLOGY': '#ff6b6b',

        // Microbiology
        'GENERAL MICROBIOLOGY': '#dee2e6',
        'BACTERIOLOGY': '#868e96',
        'VIROLOGY': '#dee2e6',

        // Pediatrics
        'GROWTH AND DEVELOPMENT (Paediatrics)': '#9f7aea',
        'INFECTIOUS DISEASE (Paediatrics)': '#ffd43b',
        'PEDIATRIC CARDIOLOGY': '#868e96',

        // Medicine
        'Cardiology (Medicine List)': '#f093fb',
        'Hematology (Medicine List)': '#339af0',
        'Endocrinology (Medicine List)': '#a0522d',
        'Neurology (Medicine List)': '#9f7aea',

        // Others
        'EPIDEMIOLOGY (PSM)': '#868e96',
        'FORENSIC TOXICOLOGY': '#ff6b6b',
        'GENERAL PHYSIOLOGY': '#f093fb',

        // Ophthalmology & ENT
        'GLAUCOMA (Ophthalmology)': '#868e96',
        'RETINA (Ophthalmology)': '#ff6b6b',
        'EAR (ENT)': '#339af0',

        // Dermatology
        'CUTANEOUS INFECTION (Dermatology)': '#339af0',
        'SKIN TUMOURS (Dermatology)': '#ff6b6b',

        // Anatomy & Radiology
        'NEUROANATOMY': '#51cf66',
        'HEAD AND NECK (Anatomy)': '#dee2e6',
        'NEURO/CNS (Radiology)': '#51cf66',

        // Anaesthesia & Orthopaedics
        'AIRWAY AND VENTILATION (Anaesthesia)': '#ff6b6b',
        'UPPER LIMB TRAUMA (Orthopaedics)': '#ff6b6b',

        // Psychiatry
        'MOOD DISORDER (Psychiatry)': '#a0522d',
        'SCHIZOPHRENIA (Psychiatry)': '#ff6b6b',

        // Default
        'default': '#667eea'
    },

    // Priority color mapping
    PRIORITY_COLORS: {
        'High RR': '#ff6b6b',
        'Moderate RR': '#ffd43b',
        'Low RR': '#51cf66',
        'video+notes➡️Main': '#9f7aea',
        'Notes ➡️ RR': '#ff6b6b'
    }
};
