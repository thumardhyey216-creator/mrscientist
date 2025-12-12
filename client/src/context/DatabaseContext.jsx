import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { initializeUser } from '../services/api';

const DatabaseContext = createContext({});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }) => {
    const { user } = useAuth();
    const [databases, setDatabases] = useState([]);
    const [currentDatabase, setCurrentDatabase] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchDatabases();
        } else {
            setDatabases([]);
            setCurrentDatabase(null);
        }
    }, [user]);

    const fetchDatabases = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                    .from('user_databases')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                // No databases found, initialize default one
                try {
                    console.log('No databases found. Initializing default database...');
                    await initializeUser(user.id);
                    // Fetch again after initialization
                    const { data: newData, error: newError } = await supabase
                        .from('user_databases')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: true });
                        
                    if (!newError && newData) {
                        setDatabases(newData);
                        if (newData.length > 0) {
                            setCurrentDatabase(newData[0]);
                        }
                    }
                } catch (initError) {
                    console.error('Auto-initialization failed:', initError);
                }
            } else {
                setDatabases(data);
                
                // Auto-select first database or restore selection
                const savedDbId = localStorage.getItem('currentDatabaseId');
                if (savedDbId) {
                    const savedDb = data.find(db => db.id === savedDbId);
                    if (savedDb) {
                        setCurrentDatabase(savedDb);
                    } else {
                        setCurrentDatabase(data[0]);
                    }
                } else {
                    setCurrentDatabase(data[0]);
                }
            }

        } catch (error) {
            console.error('Error fetching databases:', error);
        } finally {
            setLoading(false);
        }
    };

    const createDatabase = async (name, description = '', icon = '📚', initialize = false) => {
        try {
            const { data, error } = await supabase
                .from('user_databases')
                .insert([{ user_id: user.id, name, description, icon }])
                .select()
                .single();

            if (error) throw error;

            if (initialize) {
                // Initialize with default topics
                await initializeUser(user.id, data.id);
            }

            setDatabases(prev => [...prev, data]);
            setCurrentDatabase(data); // Auto-switch to new DB
            return data;
        } catch (error) {
            console.error('Error creating database:', error);
            throw error;
        }
    };

    const switchDatabase = (database) => {
        setCurrentDatabase(database);
        localStorage.setItem('currentDatabaseId', database.id);
    };

    const deleteDatabase = async (databaseId) => {
        try {
            const { error } = await supabase
                .from('user_databases')
                .delete()
                .eq('id', databaseId);

            if (error) throw error;

            setDatabases(prev => {
                const updated = prev.filter(db => db.id !== databaseId);
                // If we deleted the current database, switch to another one
                if (currentDatabase?.id === databaseId) {
                    if (updated.length > 0) {
                        switchDatabase(updated[0]);
                    } else {
                        setCurrentDatabase(null);
                        localStorage.removeItem('currentDatabaseId');
                    }
                }
                return updated;
            });
        } catch (error) {
            console.error('Error deleting database:', error);
            throw error;
        }
    };

    return (
        <DatabaseContext.Provider value={{ databases, currentDatabase, loading, createDatabase, switchDatabase, deleteDatabase, fetchDatabases }}>
            {children}
        </DatabaseContext.Provider>
    );
};
