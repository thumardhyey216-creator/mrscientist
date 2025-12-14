# Changelog

## [Unreleased]

### Performance Improvements
- **AI Recommendations**: 
  - Optimized `getRevisionInsights` to send only essential fields (excluded `notes`, `customData`), significantly reducing payload size.
  - Implemented 1-hour local storage caching in `AIRecommendations` component to prevent redundant API calls.
  - Added "Refresh" button with forced cache invalidation.
- **Chat Interface**:
  - Implemented session storage caching for `askAI` (5-minute TTL) to speed up repeated queries.
  - Optimized backend `/api/ask-ai` to truncate `notes` field (max 300 chars) before sending to Gemini, reducing latency and token usage.
- **Data Loading**:
  - Optimized `/api/supabase/topics` endpoint to exclude the heavy `notes` column from the initial list fetch, improving overall app load time and responsiveness.
- **Frontend Rendering**:
  - Added `React.memo` to `TopicList`, `StatCard`, and `DatabaseTable` to prevent unnecessary re-renders and improve scrolling performance.

### Fixes
- Fixed potential "brainstorm" slowness by addressing bottlenecks in data fetching and AI processing.
