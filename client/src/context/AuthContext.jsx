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
        console.log('🔄 AuthContext: Starting initialization...');
        let timeoutId = null;

        // Fallback: Force loading to false after 10 seconds
        timeoutId = setTimeout(() => {
            console.error('⚠️ AuthContext: Timeout! Forcing loading to false after 10s');
            setLoading(false);
        }, 10000);

        // Check active session
        const initSession = async () => {
            console.log('🔄 AuthContext: Calling supabase.auth.getSession()...');
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('✅ AuthContext: getSession complete', { hasSession: !!session, error });
                if (error) {
                    console.error('❌ AuthContext: Session fetch error:', error);
                }
                setUser(session?.user ?? null);
                if (session?.user) {
                    console.log('🔄 AuthContext: Fetching profile for user:', session.user.id);
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('❌ AuthContext: Auth initialization error:', err);
            } finally {
                console.log('✅ AuthContext: Setting loading to false');
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };

        initSession();

        // Listen for changes
        console.log('🔄 AuthContext: Setting up onAuthStateChange listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('🔔 AuthContext: onAuthStateChange fired', { event: _event, hasSession: !!session });
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            console.log('🧹 AuthContext: Cleaning up...');
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
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

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, signUp, signIn, signInWithGoogle, signInWithOtp, verifyOtp, signOut, loading, refreshProfile }}>
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
