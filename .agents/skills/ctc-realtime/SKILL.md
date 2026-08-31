---
name: ctc-realtime
description: Socket.IO workflow. Use for notifications, realtime task updates or socket behavior.
---

# Socket.IO workflow


Trace emission → payload → listener → cleanup → cache/state update. Prevent duplicates and stale listeners.


## CTC completion rule

Never claim completion without evidence from the repository and executed verification.
