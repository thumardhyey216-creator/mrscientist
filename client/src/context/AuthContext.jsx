import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './contexts';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }
            setProfile(data);
        } catch (err) {
            console.error('Profile fetch error:', err);
        }
    };

    useEffect(() => {
        // Check active session
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Session fetch error:', error);
                }
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                // If it's a LOGIN event, we might need to wait, but usually on refresh getSession handles it.
                // However, for consistency, we can await here too if we want to block UI updates until profile is ready.
                // But for onAuthStateChange, it might be better to let it flow to avoid blocking UI on simple updates.
                // The critical part for "refresh" is the initSession above.
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/dashboard`,
            },
        });
        if (error) throw error;
        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) throw error;
        return data;
    };

    const signInWithOtp = async (phone) => {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone: phone,
        });
        if (error) throw error;
        return data;
    };

    const verifyOtp = async (phone, token) => {
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms',
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, profile, signUp, signIn, signInWithGoogle, signInWithOtp, verifyOtp, signOut, loading }}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-app, #1a1b1e)', color: 'var(--text-main, white)' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
