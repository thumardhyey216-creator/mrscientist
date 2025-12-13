import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children, requireSubscription = true }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check Subscription
    if (requireSubscription) {
        const isSubscribed = profile?.subscription_status === 'active';
        
        // Check expiry if it exists
        let isExpired = false;
        if (profile?.subscription_expiry) {
            isExpired = new Date() > new Date(profile.subscription_expiry);
        }

        if (!isSubscribed || isExpired) {
             return <Navigate to="/subscription" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
