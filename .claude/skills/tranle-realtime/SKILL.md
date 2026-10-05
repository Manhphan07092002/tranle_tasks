---
name: tranle-realtime
description: Change TranLe Tasks Socket.IO/realtime behavior without creating duplicate listeners or stale state.
---

Trace:
1. server mutation/event emission
2. socket event name/payload
3. client subscription
4. state/query update
5. cleanup/unsubscribe

Check for:
- duplicate listeners
- missing cleanup
- stale closures
- duplicate notifications
- cache invalidation loops
- event payload compatibility

Verify with a focused integration/manual flow when automated coverage is absent.
