# Troubleshooting Guide

## Login and Signup Issues

### 1. "Login not working" or "Signup not working"
**Symptoms**:
- Clicking button does nothing.
- Spinner spins forever.
- Error message appears.

**Possible Causes & Solutions**:

#### A. Backend Connection Failure
- **Issue**: The frontend cannot reach the backend API (Render).
- **Diagnosis**: Check Browser Console (F12) for red network errors (404, 500, Failed to fetch).
- **Fix**: 
  - Ensure `VITE_API_URL` is set correctly in Vercel Environment Variables (`https://mrscientist.onrender.com`).
  - **New Feature**: The system now has a **Client-Side Fallback**. If the backend is unreachable, the app will attempt to communicate directly with Supabase.
  - If you see "Backend initialization failed, trying client-side fallback..." in console, this system is working.

#### B. Supabase Authentication Failure
- **Issue**: Wrong password or user does not exist.
- **Diagnosis**: Error message "Invalid login credentials".
- **Fix**: Reset password or check email spelling.

#### C. Initialization Failure (Blank Dashboard)
- **Issue**: Login works, but Dashboard is empty.
- **Diagnosis**: The initialization process (creating default database and topics) failed.
- **Fix**:
  - The system auto-retries initialization on every login.
  - If backend fails, it falls back to a minimal local initialization.
  - Check if `VITE_API_URL` is correct.

### 2. "Network Error"
- **Issue**: Internet connection is unstable.
- **Fix**: Check your connection. The app requires internet access to reach Supabase.

## Backend Deployment (Render)

### 1. Cold Start
- **Issue**: First login after a while takes a long time (30s+).
- **Cause**: Render Free Tier spins down inactive services.
- **Solution**: Wait. The app will connect once the server wakes up. Future requests will be fast.

### 2. Environment Variables
- Ensure the following are set on Render:
  - `SUPABASE_URL`
  - `SUPABASE_KEY` (Must be **Service Role Key** for full initialization functionality)
  - `NOTION_TOKEN` (Optional, for Notion sync)

## Frontend Deployment (Vercel)

### 1. Environment Variables
- Ensure `VITE_API_URL` is set to your Render backend URL (no trailing slash usually, but code handles it).
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
