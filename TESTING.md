# Testing Protocol for Authentication and Initialization

## 1. Test Environment Setup
- **Frontend**: Localhost (Vite) or Vercel Deployment
- **Backend**: Render (Production) or Localhost (if available)
- **Database**: Supabase (Production)

## 2. Test Cases

### A. Signup Flow
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S1 | Successful Signup (New User) | 1. Navigate to `/signup`<br>2. Enter valid email & password<br>3. Click "Sign Up" | - User created in Supabase<br>- Redirected to Dashboard<br>- Default database created<br>- Topics loaded (Full or Fallback) |
| S2 | Signup with Existing Email | 1. Enter already registered email<br>2. Click "Sign Up" | - Error message displayed: "User already registered" |
| S3 | Signup with Weak Password | 1. Enter short password (< 6 chars)<br>2. Click "Sign Up" | - Error message displayed (Supabase validation) |
| S4 | Signup Network Failure | 1. Disconnect Internet<br>2. Click "Sign Up" | - Error message: "Network error" or similar |

### B. Login Flow
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| L1 | Successful Login | 1. Navigate to `/login`<br>2. Enter valid credentials<br>3. Click "Sign In" | - Redirected to Dashboard<br>- Data loaded successfully |
| L2 | Invalid Password | 1. Enter correct email, wrong password | - Error: "Invalid login credentials" |
| L3 | Invalid Email | 1. Enter non-existent email | - Error: "Invalid login credentials" |
| L4 | Backend Down / Timeout | 1. Simulate Backend failure (block API URL)<br>2. Login | - Login succeeds via Supabase Auth<br>- Dashboard loads via Client-Side Fallback<br>- Console warns about backend failure |

### C. Initialization & Data Loading
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| I1 | Full Initialization | 1. New user login when Backend is UP | - `initializeUser` calls backend<br>- Backend copies `master_syllabus`<br>- User has full topic list |
| I2 | Fallback Initialization | 1. New user login when Backend is DOWN | - `initializeUser` fails backend call<br>- Fallback creates default DB<br>- Fallback inserts minimal topic set<br>- User sees dashboard with limited data |
| I3 | Data Fetching Fallback | 1. Existing user login when Backend is DOWN | - `getTopics` fails backend call<br>- Fallback queries Supabase directly<br>- User sees their existing data |

## 3. Verification Steps
1. **Check Network Tab**: Verify `/api/supabase/initialize` calls.
2. **Check Console**: Look for "Backend initialization failed, trying client-side fallback..." if backend is down.
3. **Check Supabase Dashboard**: Verify `user_databases` and `topics` tables are populated.

## 4. Load Testing
- Simulate concurrent logins using a script (e.g., k6 or JMeter) to ensure Supabase and Backend can handle load.
- **Note**: Render free tier might sleep; first request will be slow (up to 50s). The client must handle this timeout gracefully (current timeout is browser default, usually long enough).

## 5. Accessibility
- Verify Tab navigation on Login/Signup forms.
- Verify Screen Reader announces error messages.
