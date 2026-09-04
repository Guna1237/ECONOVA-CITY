# ECONOVA: CITY
# PERFORMANCE.md

## 1. PURPOSE

This document defines the performance requirements and engineering standards for ECONOVA: CITY.

The goal is to make ECONOVA feel immediate, smooth and reliable during a live event with:

- Two simultaneous game rooms
- One public projector/display per room
- Multiple player devices per room
- Realtime multiplayer communication
- Frequent game-state updates
- Animated visual transitions
- Mobile player interfaces
- An administrator/game-master interface

Performance must be treated as a product requirement, not as a final-stage optimization task.

The system must remain responsive even when players perform actions simultaneously, reconnect, refresh their browsers, or interact rapidly.

The priority order is:

1. Correctness
2. Reliability
3. Responsiveness
4. Stability
5. Visual quality
6. Resource efficiency
7. Optimization beyond the actual requirements

Do not optimize for theoretical scale that ECONOVA does not need.

Do optimize aggressively for the actual event environment.

---

# 2. PERFORMANCE PHILOSOPHY

ECONOVA is a small-player-count realtime multiplayer game.

The expected event scale is approximately:

- 2 simultaneous rooms
- Approximately 4–6 players per room
- Approximately 8–12 player devices total
- 1 projector/display per room
- 1 administrator/game-master interface

This is a small workload.

The system should therefore favor:

- simplicity
- low latency
- predictable behavior
- low failure risk
- efficient rendering
- straightforward debugging

Do NOT introduce complicated distributed infrastructure simply to achieve theoretical scalability.

The architecture must be capable of handling the expected event workload comfortably rather than being designed around millions of users.

---

# 3. PERFORMANCE TARGETS

The following targets should guide implementation.

## 3.1 Client interaction latency

For a normal player action:

Target:

`< 100 ms`

Preferred:

`< 50 ms`

This refers to the time between the user's action being submitted and the interface receiving a meaningful server response under normal LAN conditions.

The UI may provide immediate visual feedback while the authoritative result is being processed, but must never display a false successful game result before server confirmation.

---

# 3.2 LAN realtime communication

Under normal local-network conditions:

Preferred WebSocket round-trip:

`< 50 ms`

Acceptable:

`< 100 ms`

Warning:

`> 200 ms`

Critical for live gameplay:

`> 500 ms`

These are practical targets rather than guarantees.

The system must remain functionally correct even when latency temporarily increases.

---

# 3.3 Initial page load

Player interface:

Preferred:

`< 2 seconds`

Acceptable:

`< 4 seconds`

Projector interface:

Preferred:

`< 3 seconds`

The application should become usable as quickly as possible.

Do not delay the entire interface simply because a non-critical visual asset is still loading.

---

# 3.4 First meaningful render

The user should see the application's basic structure immediately.

Prioritize loading:

1. Application shell
2. Current game state
3. Essential UI
4. Essential fonts/assets
5. Secondary visual assets
6. Non-essential effects

Never make the player wait for decorative assets before they can understand what is happening.

---

# 3.5 Animation performance

Target:

`60 FPS`

Preferred on supported hardware:

`60 FPS consistently`

Minimum acceptable during normal gameplay:

`30 FPS`

A visual effect that causes substantial frame drops must be simplified or removed.

Gameplay interaction must remain responsive even while animations are playing.

---

# 3.6 Projector performance

The projector interface should be designed primarily for:

`1920 × 1080`

It must remain smooth at that resolution.

The projector should not require a powerful dedicated GPU.

Avoid rendering techniques that consume significant resources without providing meaningful visual value.

---

# 3.7 Mobile performance

Player interfaces must work smoothly on ordinary modern smartphones.

Do not assume flagship hardware.

The interface should remain responsive when:

- scrolling
- opening cards
- selecting actions
- confirming actions
- receiving realtime updates
- changing game phases
- displaying notifications

---

# 4. NETWORK ARCHITECTURE

ECONOVA should be LAN-first for the event.

The preferred deployment model is:

```text
                    LOCAL NETWORK
                         |
                  GAME SERVER
                         |
          +--------------+--------------+
          |              |              |
       PROJECTOR      PROJECTOR      PLAYERS
        ROOM A         ROOM B        A / B

```

The event should not depend unnecessarily on external internet connectivity.

The server should ideally run on a reliable local machine connected to the event network.

Internet access may be useful for development, deployment, updates or external services, but normal gameplay should not depend on external APIs.


---

5. WEBSOCKET USAGE

Realtime game communication should use WebSockets or an equally appropriate persistent realtime transport.

Do not use aggressive polling for normal gameplay state.

Avoid patterns such as:

GET /game-state
GET /game-state
GET /game-state
GET /game-state
...

every few hundred milliseconds.

Instead:

PLAYER ACTION
      ↓
SERVER
      ↓
STATE CHANGE
      ↓
REALTIME EVENT
      ↓
CONNECTED CLIENTS


---

6. SEND EVENTS, NOT UNNECESSARY FULL STATE

The server should avoid broadcasting unnecessarily large payloads.

Prefer meaningful state updates.

For example:

PROPERTY_PURCHASED
PROPERTY_DEVELOPED
DEMAND_CHANGED
EVENT_STARTED
TRADE_COMPLETED
ROUND_STARTED
TURN_CHANGED
POLICY_RESULT
GAME_ENDED

The exact event model must follow ARCHITECTURE.md.

Do not create an unnecessarily complicated event system merely to save a few bytes.

Correctness is more important than micro-optimizing payload sizes.


---

7. PUBLIC VS PRIVATE STATE

Do not broadcast the entire game state to every client simply because it is convenient.

The server should create appropriate state projections.

Conceptually:

FULL AUTHORITATIVE STATE
          |
          +---- PUBLIC STATE
          |
          +---- PLAYER A STATE
          |
          +---- PLAYER B STATE
          |
          +---- ADMIN STATE

This is both a security requirement and a performance improvement.

Clients should only receive information they need.


---

8. STATE MANAGEMENT

The server is authoritative.

Active game state should be kept in an efficient server-side representation suitable for fast access.

Do not query the database for every button press if the data is already safely available in authoritative active game state.

Avoid unnecessary database round trips during live gameplay.

Database persistence should support:

recovery

important persistent records

game/session information

required audit data


It should not become a bottleneck for normal game actions.


---

9. GAME LOOP PERFORMANCE

The game is primarily action-driven.

Do not create a high-frequency server game loop unless the game genuinely requires one.

Avoid:

setInterval(..., 16ms)

or similar continuously running processing when nothing is happening.

Prefer:

ACTION
→ VALIDATE
→ STATE TRANSITION
→ EVENT
→ BROADCAST

This keeps server resource usage low and behavior predictable.


---

10. SERVER PERFORMANCE

The server must comfortably handle:

all expected player connections

two simultaneous rooms

simultaneous actions

realtime broadcasts

reconnections

administrative actions

normal persistence


The expected event load is small.

Therefore, prioritize deterministic and maintainable code over premature horizontal scaling.

A single well-designed server should be sufficient for the expected event deployment unless testing demonstrates otherwise.


---

11. SERVER RESPONSE REQUIREMENTS

Every valid action should produce a clear authoritative result.

Every invalid action should produce a clear rejection.

The server should not leave the client waiting indefinitely.

Every request should have appropriate:

validation

timeout behavior

error handling

response/event behavior


Never let a failed request silently leave the UI in an ambiguous state.


---

12. DUPLICATE ACTION PERFORMANCE

Players may accidentally:

double tap

double click

tap repeatedly

resend a request

reconnect while an action is being processed


The server must safely handle this.

An action should not execute multiple times simply because the same request arrived repeatedly.

Use appropriate action identifiers, state validation and/or idempotency mechanisms.

Performance must never be improved by removing duplicate-action protection.


---

13. CONCURRENT ACTIONS

The server must safely handle actions arriving at approximately the same time.

Example:

Player A → BUY PROPERTY 7
Player B → BUY PROPERTY 7

The system must produce one authoritative result.

It must never produce:

Player A owns property 7
AND
Player B owns property 7

The state transition must be atomic from the perspective of the game engine.


---

14. FRONTEND RENDERING

Frontend performance should focus on minimizing unnecessary rendering.

Avoid unnecessary full-application rerenders for small state changes.

Prefer localized updates.

For example:

If demand for one district changes, do not unnecessarily rebuild every component on the screen.

Use appropriate state-management and component-architecture techniques.

Do not optimize blindly.

Measure or identify the actual bottleneck before introducing complicated optimization systems.


---

15. REACT PERFORMANCE

Where React is used:

Prefer:

stable component structure

appropriate memoization

localized state

derived values where appropriate

efficient list rendering

stable keys

controlled subscriptions


Avoid:

unnecessary global state

massive context providers causing unrelated rerenders

creating expensive objects on every render unnecessarily

rendering hundreds of unnecessary elements

deeply nested components without reason


Do not use useMemo or useCallback everywhere simply because they exist.

Optimization should be purposeful.


---

16. ANIMATION PERFORMANCE

Prefer GPU-friendly properties such as:

transform

opacity


Avoid repeatedly animating expensive layout properties where possible.

Be cautious with:

large blur effects

enormous shadows

continuous filters

excessive backdrop filters

large particle systems

expensive canvas effects

unnecessary 3D scenes


Animations should be short and purposeful.


---

17. ANIMATION RULE

Animations must never prevent gameplay.

For example:

If a property purchase animation takes 1.5 seconds, the server must not need to wait 1.5 seconds before processing the next valid action unless the game rules explicitly require it.

The animation is presentation.

The game engine is authoritative.

Do not couple game-state correctness to animation timing.


---

18. PROJECTOR OPTIMIZATION

The projector is likely to remain open for the entire game.

Therefore:

avoid memory leaks

avoid continuously accumulating DOM elements

clean up event listeners

clean up timers

clean up animations

remove expired effects

avoid unnecessary polling

avoid accumulating historical UI objects


The projector must remain stable throughout an entire session.


---

19. MOBILE OPTIMIZATION

Mobile player screens should:

avoid unnecessarily large images

avoid huge JavaScript bundles

avoid excessive animation

avoid expensive background effects

minimize unnecessary network traffic

provide immediate interaction feedback


Touch targets must remain responsive.

Do not make the user wait for an animation before another legitimate action can be selected.


---

20. ASSETS

Assets should be optimized before production.

For images:

use appropriate dimensions

use modern compressed formats where supported

avoid unnecessarily high-resolution images

avoid loading assets that are never displayed


For icons:

Prefer:

SVG

CSS

lightweight icon systems


Avoid large raster images for simple icons.


---

21. FONTS

Fonts can significantly affect initial load.

Use a small, controlled font set.

Avoid loading many unnecessary weights.

Prefer:

essential weights

efficient font formats

appropriate font-display behavior


Do not introduce five different font families simply for visual variety.


---

22. CODE SPLITTING

Use code splitting where it meaningfully improves loading.

Potential separation:

Player application
Projector application
Admin application

Do not force every client to download code belonging exclusively to another interface if the architecture naturally allows separation.

However, do not create excessive micro-bundles that increase complexity.


---

23. LAZY LOADING

Lazy-load non-critical resources where useful.

Examples:

large optional images

secondary screens

admin-only tools

non-critical visual effects


Do not lazy-load something required immediately for the main game interface.


---

24. NETWORK PAYLOADS

Keep realtime payloads:

typed

compact

predictable

validated

scoped


Do not send unnecessary data.

Avoid repeatedly transmitting:

static configuration

unchanged player information

large asset data

entire historical logs


when a smaller update is sufficient.


---

25. NETWORK FAILURE

Performance must degrade gracefully under poor network conditions.

If a connection becomes slow:

show connection status

prevent duplicate actions

retain authoritative state

reconnect automatically where appropriate

resynchronize state

do not invent local authoritative results


Never allow a network delay to cause client-side game-state corruption.


---

26. RECONNECTION PERFORMANCE

A reconnecting client should not need to replay the entire history manually.

The server should be capable of providing the correct current state or an appropriate state synchronization mechanism.

Reconnection should be:

fast

deterministic

secure

room-specific

player-specific



---

27. DATABASE PERFORMANCE

Do not optimize the database before the actual schema exists.

When database access is required:

use appropriate indexes

avoid unnecessary queries

avoid N+1 query patterns

use transactions where required for integrity

avoid storing excessive transient data

close/reuse connections correctly


Do not use the database as a realtime message bus unless specifically justified.


---

28. LOGGING PERFORMANCE

Logging is useful but excessive logging can hurt performance and make debugging harder.

Production logs should focus on:

errors

warnings

important lifecycle events

important game events

security events

connection problems

administrative actions


Do not continuously log every harmless UI update.

Avoid logging sensitive information.


---

29. DEVELOPMENT PERFORMANCE

AI agents must not waste time repeatedly rebuilding the same systems.

Before implementing:

1. Search the repository.


2. Understand existing code.


3. Reuse existing utilities.


4. Check whether another agent already implemented the required capability.


5. Make focused changes.



Do not create:

gameEngine.ts
gameEngine2.ts
gameEngineFinal.ts
gameEngineNew.ts

because the existing implementation was not inspected.


---

30. PERFORMANCE REGRESSIONS

Any major feature can introduce a performance regression.

When implementing a feature that affects:

rendering

WebSockets

game state

database

animations

assets


consider its performance impact.

If a measurable regression occurs, document it.


---

31. PERFORMANCE MEASUREMENT

Do not rely only on subjective statements such as:

"It feels fast."

Use measurements where practical.

Useful measurements include:

page load time

time to usable interface

WebSocket latency

action response time

FPS

memory usage

bundle size

network payload size

server CPU usage

server memory usage


Measurements do not need to be elaborate.

Simple evidence is better than unsupported claims.


---

32. PERFORMANCE BUDGETS

Where practical, establish budgets for:

Initial client bundle

Keep it as small as reasonably possible for the chosen architecture.

Do not introduce a large library for a tiny feature without justification.

Images

Avoid unnecessarily large assets.

Animations

Avoid sustained expensive effects.

WebSocket messages

Only transmit information necessary for the receiving client.

Server processing

A normal action should require only a small amount of CPU work.

These are engineering guidelines rather than arbitrary reasons to reject useful functionality.


---

33. MEMORY MANAGEMENT

The application may run continuously for the duration of the event.

Therefore, investigate:

event listeners that are never removed

timers that continue after components disappear

WebSocket handlers that accumulate

DOM elements that are never removed

cached assets that grow indefinitely

game events stored without bounds

unnecessary retained state


A memory leak that only appears after 10 minutes may still matter during a live event.


---

34. SERVER MEMORY

The server must not continuously accumulate obsolete game state.

When a game ends:

release active runtime state when appropriate

clean up connections

clean up timers

clean up subscriptions

preserve only required persistent data


When a room is reset:

completely clear obsolete runtime state

ensure no previous game's state leaks into the next game



---

35. TIMER MANAGEMENT

Game timers must be centralized and controlled.

Avoid creating independent timers throughout unrelated components.

Prefer a controlled server-side timing system for gameplay-critical timers.

Client timers should be considered presentation only unless explicitly documented otherwise.

After a timer is destroyed or a game ends, associated resources must be cleaned up.


---

36. PERFORMANCE AND SECURITY

Never weaken security for performance.

Examples of unacceptable shortcuts:

removing server-side validation

trusting client balances

trusting client ownership

sending all private state to all players

skipping authorization

accepting arbitrary WebSocket messages

disabling duplicate-action protection


A faster insecure game is not a successful game.


---

37. PERFORMANCE AND CORRECTNESS

Never make an optimization that changes game behavior unless the change is explicitly approved.

Examples:

Do not:

drop game events merely to reduce network traffic

skip state updates because they seem visually unnecessary

process only the "latest" action when earlier actions matter

approximate financial calculations

move authoritative calculations to the client


Correct state is more important than marginal speed.


---

38. TWO-ROOM PERFORMANCE

Performance testing must include both rooms running simultaneously.

Test:

ROOM A
4–6 active players
+
ROOM B
4–6 active players
+
2 projectors
+
admin interface

The system should remain responsive when both rooms are active.

Do not test only one room and assume two rooms will behave identically.


---

39. SIMULTANEOUS PLAYER ACTION TEST

Test situations where multiple players act nearly simultaneously.

Examples:

two purchases

multiple trades

multiple card actions

simultaneous voting

round transition while clients are connected

reconnect while another player is acting


Verify:

no corruption

no duplicated actions

no lost legitimate actions

no cross-room effects

correct final state



---

40. STRESS TESTING

The expected workload is small, but basic stress testing is still required.

The system should be tested with more activity than expected where reasonably possible.

Test:

more simultaneous connections than the event requires

rapid repeated actions

rapid WebSocket messages

repeated reconnects

repeated room creation

simultaneous room activity


The purpose is not to prove massive scalability.

The purpose is to identify obvious instability before the event.


---

41. LOAD TESTING PRINCIPLE

Do not spend excessive development time proving that the system can support thousands of players when the actual event needs approximately a dozen.

Use load testing to answer:

"Will the actual event workload be comfortably safe?"

not:

"Can this university game become a global MMO?"


---

42. BROWSER PERFORMANCE TESTING

At minimum test:

modern desktop browser

modern Android browser

projector-sized desktop browser


Where practical, test on actual event hardware.

Do not rely entirely on a high-end development machine.


---

43. PROJECTOR VISUAL PERFORMANCE

The projector should maintain:

smooth transitions

readable animations

stable frame rate

no visible stuttering

no accumulating visual artifacts


Large background animations should not continuously consume resources when nothing meaningful is changing.

Prefer event-triggered animation over constantly running animation.


---

44. REDUCED-MOTION / FALLBACK BEHAVIOR

Where practical, support reduced-motion preferences.

More importantly, provide graceful visual degradation.

If hardware cannot handle an effect smoothly:

reduce particles

reduce blur

reduce 3D complexity

reduce animation intensity

retain the important information


Never allow decorative effects to compromise gameplay.


---

45. OFFLINE/LAN RESILIENCE

The event deployment should be able to function without relying on external cloud services during normal gameplay.

Avoid making gameplay dependent on:

external image APIs

external AI APIs

third-party analytics

external databases

external authentication services

external content delivery


If an external service is genuinely required, the system should have a documented fallback.


---

46. STARTUP PERFORMANCE

Event-day startup should be simple.

Target process:

START SERVER
      ↓
VERIFY DATABASE
      ↓
CREATE/LOAD GAME ROOMS
      ↓
OPEN PROJECTOR
      ↓
PLAYERS JOIN
      ↓
START GAME

Startup scripts should clearly report:

server status

network address

room status

database status

connected clients


Avoid requiring complicated manual configuration immediately before the event.


---

47. RECOVERY PERFORMANCE

Recovery should be quick and predictable.

If a player refreshes:

Reconnect → Authenticate → Resynchronize → Continue

If a projector browser crashes:

Reopen → Authenticate as projector → Resynchronize → Continue

If an ordinary client crashes:

Reconnect → Receive current state → Continue

Do not require manually rebuilding the game state.


---

48. ADMIN PERFORMANCE

The admin interface must remain responsive while the game is running.

Admin actions should not require expensive database operations unless necessary.

Administrative operations must not block normal player gameplay unnecessarily.


---

49. PERFORMANCE-RELATED ARCHITECTURAL CHANGES

Any major performance-driven architectural change must be documented in:

docs/DECISIONS.md

Include:

problem

evidence

proposed change

expected benefit

trade-offs

implementation

testing

decision


Do not redesign the architecture based solely on intuition.


---

50. PERFORMANCE REVIEW CHECKLIST

Before release, verify:

Client

[ ] Initial load is acceptable

[ ] Main interface becomes usable quickly

[ ] No obvious unnecessary rerenders

[ ] No memory leaks discovered

[ ] Mobile interface is responsive

[ ] Projector interface is smooth

[ ] Animations maintain acceptable FPS

[ ] Assets are optimized

[ ] No unnecessary heavy dependencies


Server

[ ] Normal actions respond quickly

[ ] WebSockets remain stable

[ ] No unnecessary polling

[ ] State transitions are efficient

[ ] No uncontrolled memory growth

[ ] Timers are cleaned up

[ ] Connections are cleaned up

[ ] Database access is reasonable


Multiplayer

[ ] Two rooms operate simultaneously

[ ] Simultaneous actions are safe

[ ] Duplicate requests are handled

[ ] Reconnect works

[ ] State synchronization works

[ ] Room isolation works


Event

[ ] Tested on realistic hardware

[ ] Tested on event network

[ ] Projector tested at target resolution

[ ] Player devices tested

[ ] Server startup tested

[ ] Recovery procedure tested

[ ] Backup procedure tested



---

51. PERFORMANCE INCIDENT LEVELS

Use the following severity levels.

P0 — Critical

Examples:

server freezes

game becomes unplayable

major state corruption

both rooms become unavailable

severe memory leak

unrecoverable performance failure


Must be fixed before release.

P1 — High

Examples:

repeated frame drops

major latency spikes

projector becomes unstable

reconnect causes significant delay

server becomes unstable under expected workload


Should be fixed before release.

P2 — Medium

Examples:

noticeable animation stutter

slow non-critical screen

unnecessary network traffic

moderate bundle-size issue


Fix where practical.

P3 — Low

Examples:

minor visual performance issue

optimization with negligible practical benefit


Do not let P3 work delay critical reliability work.


---

52. WHAT NOT TO DO

Do not:

add Redis merely because it is popular

add Kubernetes

create microservices unnecessarily

add a message queue without a real requirement

introduce a heavy 3D engine for decorative purposes

continuously poll the server

store every UI event in the database

send full state to every client after every tiny change

optimize code that has no measurable problem

remove validation to gain speed

sacrifice reliability for visual effects

build for imaginary scale



---

53. PERFORMANCE PRIORITY DURING DEVELOPMENT

When deciding between alternatives, prefer:

Option A

Simple, reliable, fast and easy to debug.

over:

Option B

Technically sophisticated but difficult to maintain.

Prefer:

Option A

Smooth 2D/2.5D visuals.

over:

Option B

Laggy high-complexity 3D visuals.

Prefer:

Option A

Efficient server-authoritative state.

over:

Option B

Complicated distributed synchronization.

Prefer:

Option A

Measured optimization.

over:

Option B

Speculative optimization.


---

54. FINAL PERFORMANCE STANDARD

ECONOVA is considered performance-ready only when:

1. Two rooms can operate simultaneously.


2. Expected player connections remain stable.


3. Normal player actions feel immediate.


4. WebSocket communication remains responsive.


5. The projector remains smooth for the full game.


6. Mobile interfaces remain responsive.


7. No significant memory leak is observed during a full session.


8. Reconnection works without corrupting state.


9. Simultaneous actions do not corrupt state.


10. The application remains usable during temporary network degradation.


11. The system has been tested on realistic event hardware.


12. No known P0 or P1 performance issue remains.


13. Visual effects do not compromise gameplay.


14. Security and server authority have not been weakened for performance.


15. The complete two-room event scenario has been rehearsed.




---

55. FINAL PRINCIPLE

The goal is not to make ECONOVA the most technically complicated application possible.

The goal is to make it feel effortless.

Players should tap an action and immediately understand what happened.

The projector should update smoothly.

The server should remain stable.

Two rooms should run independently.

Animations should look impressive without slowing the game.

If something fails, the game should recover instead of collapsing.

Every performance decision should serve that outcome.

A fast system that breaks is not fast.

A beautiful system that lags is not beautiful.

A technically sophisticated system that is unreliable is not successful.

ECONOVA: CITY must be:

FAST. SMOOTH. STABLE. PREDICTABLE. RELIABLE.

END OF PERFORMANCE.md
