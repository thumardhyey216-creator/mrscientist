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
- **Reschedule Logic**:
  - Fixed an issue where the AI didn't know "Today's Date", causing failures when rescheduling with relative dates (e.g., "before April 5").
  - Added explicit instructions to the AI prompt to handle "deadline-based" rescheduling (fitting all topics before a specific date).
  - "Trained" the AI model via prompt engineering to handle complex scenarios:
    - Shifting schedules ("Push by X days", "I was sick").
    - Compression ("Finish by [Date]").
    - Constraints ("Free up weekends", "Focus on Subject").
    - Provided few-shot examples in the prompt to ensure consistent JSON output.
  - Fixed potential "brainstorm" slowness by addressing bottlenecks in data fetching and AI processing.
