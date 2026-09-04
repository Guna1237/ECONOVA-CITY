# ECONOVA: CITY
# ARCHITECTURE.md

Version: 1.0
Status: Production Architecture
Purpose: Technical source of truth for the ECONOVA: CITY application

---

# 1. DOCUMENT PURPOSE

This document defines the technical architecture of ECONOVA: CITY.

It is the primary technical reference for all AI agents and developers working on the project.

This document defines:

- application architecture
- frontend architecture
- backend architecture
- game-engine architecture
- realtime communication
- room architecture
- state management
- data flow
- database responsibilities
- authentication and authorization boundaries
- deployment
- recovery
- testing boundaries
- performance requirements
- scalability expectations
- separation of responsibilities

This document does NOT define the gameplay rules themselves.

Gameplay rules belong in:

`docs/GAME_DESIGN_SPEC.md`

Product and experience requirements belong in:

`docs/PRODUCT.md`

Visual requirements belong in:

`docs/VISUAL_SYSTEM.md`

Security requirements belong in:

`docs/SECURITY.md`

---

# 2. ARCHITECTURAL OBJECTIVE

ECONOVA: CITY is a small-scale realtime multiplayer strategy game designed to operate reliably during a live university event.

The system must support:

- multiple independent game rooms
- approximately 4–6 players per room
- at least two simultaneous rooms
- one public projector display per room
- private player interfaces on personal devices
- an administrative/game-master interface
- realtime game-state updates
- player reconnection
- authoritative server-side gameplay
- strong game-state integrity
- low latency
- reliable operation on a local network
- graceful handling of common failures

The architecture should be simple enough to operate and debug during a live event.

Do not introduce infrastructure complexity that is unnecessary for the expected player count.

---

# 3. HIGH-LEVEL ARCHITECTURE

The application consists of four major runtime surfaces:

1. Player Client
2. Projector Client
3. Admin Client
4. Game Server

The system also contains:

5. Game Engine
6. Persistence Layer
7. Shared Types/Validation Layer

Conceptually:

                    ECONOVA: CITY

                         |
                 ┌───────┴────────┐
                 │   GAME SERVER  │
                 │                │
                 │ API            │
                 │ WebSockets     │
                 │ Game Engine    │
                 │ Validation     │
                 │ Room Manager   │
                 └───────┬────────┘
                         |
              ┌──────────┼──────────┐
              |          |          |
           PLAYER     PROJECTOR    ADMIN
           CLIENT      CLIENT      CLIENT
              |          |          |
              └──────────┴──────────┘
                         |
                   PERSISTENCE
                    PostgreSQL

The server is authoritative.

All clients are consumers of authoritative server state.

---

# 4. CORE ARCHITECTURAL PRINCIPLE

The central architectural rule is:

CLIENTS REQUEST.
SERVER DECIDES.

A client must never directly determine authoritative game state.

Example:

Player Client:

    BUY_PROPERTY(propertyId)

The server:

1. authenticates the player
2. verifies the room
3. verifies the game
4. verifies the current phase
5. verifies the current player
6. validates the property
7. validates the player's resources
8. validates all relevant gameplay rules
9. applies the state transition
10. records the resulting event/state change
11. sends the resulting state to the relevant clients

The client does not decide whether the purchase succeeded.

---

# 5. TECHNOLOGY DIRECTION

The preferred technical direction is:

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion where appropriate
- SVG/CSS for most visual elements
- Three.js / React Three Fiber only where a specific visual requirement justifies it

## Backend

- Node.js
- TypeScript
- Fastify
- WebSockets

## Validation

- Zod or an equivalent strongly typed runtime validation system

## Database

- PostgreSQL

## Testing

- Vitest
- Playwright
- integration tests
- multiplayer tests
- security tests

## Version Control

- Git

The exact versions and final dependency choices should be determined during implementation and recorded when they materially affect architecture.

Do not add dependencies unnecessarily.

---

# 6. APPLICATION COMPONENTS

The repository should conceptually contain:

    apps/
        client/
        projector/
        admin/
        server/

    packages/
        game-engine/
        shared/
        validation/
        ui/

    tests/
        unit/
        integration/
        multiplayer/
        security/
        e2e/

The exact implementation structure may evolve if the resulting architecture remains consistent with this document.

---

# 7. PLAYER CLIENT

The Player Client is the private interface used by individual players on their phones.

Responsibilities:

- joining a room
- identifying the player
- displaying private state
- displaying public state
- presenting available actions
- sending action requests
- displaying action results
- displaying errors
- displaying trade information
- displaying private objectives/cards where applicable
- handling connection status
- handling reconnection
- providing immediate UI feedback

The Player Client must NOT own authoritative game state.

The Player Client may maintain:

- temporary UI state
- navigation state
- animation state
- input state
- optimistic presentation state where safe

It must not permanently determine gameplay outcomes.

---

# 8. PROJECTOR CLIENT

Each game room has a public projector display.

The Projector Client is read-oriented.

Responsibilities:

- display the public game board
- display public player information
- display current round
- display current turn
- display public events
- display public demand/market information
- display public policy information
- display public ownership
- display public leaderboard information
- display transitions and animations
- display game completion

The Projector Client must never display private player information.

The Projector Client should not require normal player interaction.

The projector should receive a dedicated public-state projection from the server.

Do not send the complete server state to the projector.

---

# 9. ADMIN CLIENT

The Admin Client is used by authorized organizers/game masters.

Potential responsibilities include:

- create room
- configure room
- start game
- pause game
- resume game
- inspect room status
- monitor players
- assist with reconnects
- perform authorized emergency operations
- reset a game
- end a game
- inspect errors
- access operational diagnostics

Admin functionality is privileged.

Authorization must be enforced by the server.

Hiding admin controls from normal users is not sufficient security.

---

# 10. GAME SERVER

The Game Server is the central authority.

Responsibilities:

- player sessions
- room management
- authentication/identity
- authorization
- WebSocket connections
- action reception
- action validation
- game-engine execution
- state transitions
- event generation
- public/private state projections
- persistence
- reconnection
- error handling
- admin operations
- room isolation
- logging

The Game Server must not depend on the frontend to enforce gameplay rules.

---

# 11. GAME ENGINE

The Game Engine contains the actual game-state logic.

It should be as independent from network and UI code as practical.

Conceptually:

    Game Action
         |
         v
    Validation
         |
         v
    Game Engine
         |
         v
    State Transition
         |
         v
    Game Events
         |
         v
    State Projection
         |
         v
    Clients

The Game Engine should be testable without:

- a browser
- a projector
- a WebSocket connection
- a live database

This makes gameplay testing faster and safer.

---

# 12. GAME ENGINE RESPONSIBILITIES

The Game Engine should manage:

- game state
- player state
- room game state
- rounds
- turns
- game phases
- property state
- resources
- cards
- events
- policies
- scoring
- valid actions
- state transitions

The exact gameplay behavior must come from:

`docs/GAME_DESIGN_SPEC.md`

Do not duplicate gameplay rules in multiple systems.

---

# 13. GAME STATE

The authoritative game state should conceptually contain information such as:

    GameState
        gameId
        roomId
        status
        round
        phase
        currentPlayer
        players
        properties
        districts
        demand
        events
        policies
        cards
        scores
        history
        timestamps
        version

The exact schema belongs to implementation.

Do not add fields merely because they seem useful.

Every authoritative field should have a clear purpose.

---

# 14. PLAYER STATE

Player state may conceptually contain:

    PlayerState
        playerId
        displayName
        credits
        influence
        properties
        cards
        objectives
        score
        connectionState

Some fields are public.

Some fields are private.

The server must determine what each client is allowed to receive.

---

# 15. PUBLIC STATE VS PRIVATE STATE

The server must maintain a clear distinction between:

## Public state

Information all players/projectors are allowed to see.

Examples may include:

- player names
- public ownership
- public property levels
- public demand
- public events
- public round
- public turn
- public scores where applicable

## Private state

Information visible only to the appropriate player/admin.

Examples may include:

- secret objectives
- private cards
- private information
- private trade information where applicable

Never solve privacy by sending everything to every browser and hiding it with frontend code.

The server must generate appropriate state projections.

---

# 16. STATE PROJECTION

Conceptually:

    AUTHORITATIVE STATE
            |
            +----> PUBLIC STATE
            |
            +----> PLAYER A STATE
            |
            +----> PLAYER B STATE
            |
            +----> ADMIN STATE

Each projection contains only information appropriate for that recipient.

This reduces:

- information leakage
- unnecessary bandwidth
- accidental exposure
- client complexity

---

# 17. ACTION ARCHITECTURE

Clients send commands/actions.

Examples:

    JOIN_ROOM
    READY
    BUY_PROPERTY
    DEVELOP_PROPERTY
    PROPOSE_TRADE
    ACCEPT_TRADE
    REJECT_TRADE
    PLAY_CARD
    VOTE
    END_TURN

These are examples only.

The actual action list belongs to `docs/GAME_DESIGN_SPEC.md`.

Actions should have:

- action type
- action ID
- authenticated player
- room/game context
- validated payload
- appropriate sequence/version information

The client should not send authoritative state changes such as:

    SET_MONEY
    SET_OWNER
    SET_SCORE

Such operations should not exist as normal player actions.

---

# 18. ACTION PIPELINE

Every action should follow approximately:

    CLIENT
       |
       v
    RECEIVE MESSAGE
       |
       v
    PARSE
       |
       v
    AUTHENTICATE
       |
       v
    AUTHORIZE
       |
       v
    VALIDATE PAYLOAD
       |
       v
    VALIDATE GAME STATE
       |
       v
    EXECUTE GAME ENGINE
       |
       v
    ATOMIC STATE UPDATE
       |
       v
    RECORD EVENT
       |
       v
    PERSIST IF REQUIRED
       |
       v
    GENERATE PROJECTIONS
       |
       v
    BROADCAST
       |
       v
    CLIENTS UPDATE

If validation fails, the state must remain unchanged.

---

# 19. ACTION ATOMICITY

Gameplay actions must be treated as atomic state transitions.

A successful action should either:

- fully apply

or:

- not apply at all

Avoid partial state changes.

Example:

If a purchase requires:

- deducting credits
- assigning ownership
- generating an event

the system must not end up with:

- credits deducted
- property unowned

because a later step failed.

Use appropriate transaction/state-transition mechanisms.

---

# 20. IDEMPOTENCY

Important actions should be protected against duplicate execution.

Possible causes:

- double tap
- browser retry
- network retry
- duplicate WebSocket message
- reconnect
- malicious replay

Every important action should have an action ID or equivalent mechanism.

If the same action is received twice, it must not produce two gameplay outcomes.

---

# 21. VERSIONED STATE

Where appropriate, authoritative game state should have a monotonically increasing version.

Conceptually:

    stateVersion = 101

After a successful transition:

    stateVersion = 102

Clients can use versions to identify stale state.

This can help detect:

- out-of-order updates
- stale requests
- reconnect synchronization problems
- inconsistent client state

The exact implementation is determined by the server architecture.

---

# 22. REALTIME COMMUNICATION

WebSockets should be the primary realtime communication mechanism.

The server should push relevant updates to connected clients rather than requiring aggressive polling.

WebSocket communication should support:

- connection
- authentication
- room subscription
- state synchronization
- action submission
- action result
- state updates
- errors
- reconnect
- connection status

---

# 23. WEBSOCKET MESSAGE DESIGN

Messages should have a clear structure.

Conceptually:

    {
        type: "...",
        requestId: "...",
        version: 123,
        payload: {}
    }

Do not allow arbitrary unvalidated objects to enter the game engine.

Every incoming message must be parsed and validated.

Every outgoing message should contain only information appropriate to the recipient.

---

# 24. REST/API RESPONSIBILITIES

HTTP APIs may be used for:

- health checks
- room creation
- joining/bootstrap
- admin operations
- configuration
- persistence operations
- diagnostics where appropriate

WebSockets should handle realtime gameplay communication.

Do not force all operations through either REST or WebSockets without considering their purpose.

---

# 25. ROOM MANAGER

The Room Manager is responsible for active game rooms.

Conceptually:

    RoomManager
        |
        +-- Room A
        |     |
        |     +-- Game State
        |     +-- Players
        |     +-- Connections
        |
        +-- Room B
              |
              +-- Game State
              +-- Players
              +-- Connections

Room state must be isolated.

A room should have a unique internal identifier.

Client-provided room identifiers must be validated.

---

# 26. ROOM ISOLATION

Every room-scoped operation must verify:

- room exists
- connection belongs to room
- player belongs to room
- requested game belongs to room
- requested object belongs to the same room

Never rely on:

- frontend restrictions
- URL parameters alone
- local storage
- hidden UI controls

for room isolation.

---

# 27. TWO-ROOM OPERATION

The architecture must support at least:

    ROOM A
    ROOM B

running simultaneously.

Each room should maintain:

- independent game state
- independent players
- independent connections
- independent projector
- independent lifecycle

A failure in one room should not unnecessarily terminate another room.

---

# 28. LOCAL NETWORK OPERATION

The preferred event-day deployment should support local network operation.

The objective is to avoid making gameplay dependent on external internet connectivity.

Conceptually:

    EVENT LAPTOP / SERVER
            |
        LOCAL ROUTER
        /     |     \
    Room A  Room B  Players

The exact physical networking setup depends on available university hardware.

The game should be able to operate over a local network when the deployment environment permits it.

---

# 29. SERVER DEPLOYMENT

For the event, the server should preferably run on a controlled machine under the organizers' control.

Potential deployment:

    Event Computer
        |
        +-- Node.js Game Server
        |
        +-- PostgreSQL
        |
        +-- Projector A client
        |
        +-- Projector B client

Player devices connect through the local network.

Avoid unnecessary external dependencies during live gameplay.

---

# 30. DATABASE RESPONSIBILITY

PostgreSQL should be used for persistent information where appropriate.

Potential persistent information:

- room metadata
- game metadata
- player metadata
- completed games
- final results
- configuration
- audit information
- recovery data

Transient UI state does not automatically need database persistence.

The exact schema belongs to implementation.

---

# 31. ACTIVE GAME STATE

Active game state may be maintained in memory for fast gameplay.

For the expected small player count, this can provide:

- extremely low access latency
- simple state transitions
- reduced database traffic
- simpler realtime behavior

However, appropriate persistence/recovery mechanisms should exist for important state.

Do not assume an in-memory-only architecture is acceptable for every production requirement without considering recovery.

---

# 32. PERSISTENCE STRATEGY

The system should distinguish between:

## Authoritative active state

Used for immediate gameplay.

## Persistent state

Used for:

- recovery
- audit
- completed game records
- results
- operational diagnostics

The implementation should avoid turning PostgreSQL into a bottleneck for every visual update.

---

# 33. EVENT LOG

Where practical, important gameplay transitions should produce structured events.

Examples:

    PROPERTY_PURCHASED
    PROPERTY_DEVELOPED
    TRADE_COMPLETED
    POLICY_RESOLVED
    ROUND_STARTED
    ROUND_ENDED
    GAME_ENDED

The exact events belong to the game implementation.

Events are useful for:

- projector animations
- auditability
- debugging
- replaying state transitions where supported
- testing

Do not use an event system merely because it sounds sophisticated.

---

# 34. EVENT VS STATE

State answers:

"What is true now?"

Events answer:

"What happened?"

Example:

State:

    Player A owns Property 5.

Event:

    PROPERTY_PURCHASED

The game should not require the UI to reconstruct authoritative state from animations.

The server state remains authoritative.

---

# 35. FRONTEND STATE MANAGEMENT

Frontend state should be separated into:

## Server state

Data received from the server.

## UI state

Local interface state.

## Animation state

Temporary visual state.

Do not duplicate the complete game engine in React.

Server state should be synchronized from authoritative server messages.

---

# 36. OPTIMISTIC UI

Optimistic updates may be used only where they cannot compromise game integrity.

For important actions such as:

- purchases
- trades
- votes
- development
- card usage

the UI should not falsely present the action as successful before server confirmation.

It may show:

"Processing..."

until the authoritative result arrives.

---

# 37. PROJECTOR DATA FLOW

The projector should follow:

    SERVER
       |
       v
    PUBLIC STATE
       |
       v
    PROJECTOR CLIENT
       |
       v
    VISUAL RENDERING

The projector should not independently calculate game outcomes.

Animations should be triggered by authoritative events.

---

# 38. PLAYER DATA FLOW

The player client should follow:

    SERVER
       |
       +---- Public State
       |
       +---- Private State
       |
       v
    PLAYER CLIENT

Player action:

    PLAYER CLIENT
         |
         v
    ACTION REQUEST
         |
         v
    SERVER
         |
         v
    AUTHORITATIVE RESULT
         |
         v
    PLAYER CLIENT

---

# 39. ADMIN DATA FLOW

Admin actions should follow:

    ADMIN CLIENT
         |
         v
    AUTHENTICATED REQUEST
         |
         v
    SERVER AUTHORIZATION
         |
         v
    ADMIN OPERATION
         |
         v
    AUTHORITATIVE RESULT

Never allow an admin UI operation to bypass server authorization.

---

# 40. CONNECTION MANAGEMENT

Each connection should have an associated authenticated session/identity.

The server should track:

- connection ID
- player ID where applicable
- room ID
- connection state
- last known state/version
- authentication state

A disconnected player should not automatically be treated as a new player when reconnecting.

---

# 41. RECONNECTION FLOW

Conceptually:

    PLAYER DISCONNECTS
           |
           v
    SERVER RETAINS PLAYER ID
           |
           v
    PLAYER RECONNECTS
           |
           v
    AUTHENTICATE
           |
           v
    VERIFY ROOM
           |
           v
    SEND CURRENT AUTHORIZED STATE
           |
           v
    PLAYER CONTINUES

Do not duplicate the player's game state during reconnect.

---

# 42. SESSION IDENTITY

Player identity must be separate from browser UI state.

Do not rely solely on:

- React state
- localStorage
- a visible player name

for authoritative identity.

The server must determine whether a reconnecting client is actually associated with a player.

The exact authentication mechanism should be documented when implemented.

---

# 43. PERFORMANCE TARGETS

The architecture should target:

- immediate local-network interaction
- low WebSocket latency
- smooth projector rendering
- smooth mobile interaction
- no unnecessary polling
- efficient state updates
- stable memory usage
- no obvious UI freezes

For normal local-network conditions, gameplay interactions should feel effectively instantaneous to the user.

Exact measurable targets should be recorded in:

`docs/PERFORMANCE.md`

---

# 44. RENDERING PERFORMANCE

The frontend should minimize unnecessary rendering.

Prefer:

- component isolation
- memoization where useful
- efficient state subscriptions
- GPU-friendly transforms
- optimized assets
- controlled animations

Avoid:

- unnecessary full-screen re-renders
- continuously running expensive effects
- unnecessarily large DOM trees
- excessive particle systems
- large unoptimized images
- unnecessary 3D scenes

---

# 45. 3D USAGE

3D is optional.

Three.js or React Three Fiber may be used if a specific feature substantially improves the experience.

Do not use 3D simply because it is technically impressive.

The visual system should prefer the technology that provides the best balance of:

- visual quality
- frame rate
- implementation complexity
- event-day reliability

A highly polished 2D/2.5D experience is preferable to unstable 3D.

---

# 46. ASSET MANAGEMENT

Assets should be:

- optimized
- appropriately sized
- compressed where appropriate
- named clearly
- organized logically

Do not ship enormous source assets when smaller optimized versions are sufficient.

Use appropriate loading strategies.

Do not allow asset loading to block the core game unnecessarily.

---

# 47. ERROR BOUNDARIES

Frontend errors should not crash the entire application.

Use appropriate boundaries for:

- player UI
- projector UI
- admin UI

A visual component failure should not corrupt game state.

Server errors should be isolated from individual room state where possible.

---

# 48. LOGGING

Server logging should provide useful operational information.

Important logs may include:

- server startup
- room creation
- player connection
- player disconnection
- action rejection
- critical game errors
- admin actions
- room lifecycle
- persistence failures

Do not log:

- passwords
- authentication secrets
- private credentials
- unnecessary private player information

Use structured logging where practical.

---

# 49. HEALTH CHECKS

The server should expose a simple health mechanism.

It should be possible for an operator to determine whether:

- server is running
- database is reachable if required
- WebSocket system is operational
- required services are available

Health checks should not expose sensitive information.

---

# 50. GRACEFUL FAILURE

When an action fails:

- do not corrupt state
- return a clear error
- log the technical reason where appropriate
- keep the room operational

When a client disconnects:

- preserve authoritative state
- allow reconnection

When a non-critical UI effect fails:

- continue gameplay

The system should degrade gracefully.

---

# 51. SECURITY ARCHITECTURE

Security requirements are defined in:

`docs/SECURITY.md`

At the architectural level:

- server is authoritative
- clients are untrusted
- every action is validated
- private data is projected
- rooms are isolated
- admin operations are authorized
- WebSocket input is validated
- duplicate actions are controlled
- secrets are never shipped to clients

Security logic must not depend solely on frontend behavior.

---

# 52. VALIDATION LAYER

All external inputs should pass through validation.

External inputs include:

- HTTP requests
- WebSocket messages
- player actions
- room codes
- player identifiers
- admin commands
- configuration input

Use typed runtime schemas.

Invalid input should be rejected before reaching core game logic.

---

# 53. GAME ENGINE / NETWORK SEPARATION

The Game Engine should not know unnecessary details about:

- HTTP
- WebSocket connections
- React
- DOM
- browser storage
- projector rendering

Likewise, the WebSocket layer should not contain large amounts of gameplay logic.

This separation makes the system:

- easier to test
- easier to debug
- easier to modify
- harder to accidentally break

---

# 54. SERVER / DATABASE SEPARATION

The Game Server should own gameplay execution.

The database should provide persistence.

Do not make gameplay correctness dependent on arbitrary database reads scattered throughout every game action.

Where practical:

    Request
       |
       v
    Server
       |
       v
    Game Engine
       |
       v
    State Transition
       |
       +----> persistence
       |
       v
    Client Update

---

# 55. SCALABILITY

The initial target is small:

- approximately 4–6 players per room
- at least two rooms
- approximately 8–12 simultaneous players

The architecture should comfortably handle this.

Do not optimize for thousands of concurrent players unless the product requirements change.

However, code should not unnecessarily prevent future expansion.

---

# 56. MULTI-ROOM RESOURCE ISOLATION

Rooms should have independent:

- state
- event streams
- player lists
- WebSocket subscriptions
- projector state
- game lifecycle

Shared infrastructure is acceptable.

Shared authoritative game state is not.

---

# 57. DEPLOYMENT SIMPLICITY

The event-day deployment should be simple enough that a non-developer organizer can follow documented instructions.

Ideally:

    START SERVER
       |
       v
    CREATE ROOMS
       |
       v
    OPEN PROJECTOR A
       |
       v
    OPEN PROJECTOR B
       |
       v
    PLAYERS JOIN
       |
       v
    START GAMES

The exact procedure belongs in deployment documentation when implementation begins.

---

# 58. BACKUP AND RECOVERY

Before the event:

- maintain a known-good build
- maintain a known-good database state
- maintain source backups
- maintain environment configuration instructions
- maintain a local/offline copy where appropriate
- maintain a fallback operating procedure

Do not rely on one laptop, one browser tab, or one untested deployment.

---

# 59. DEVELOPMENT ENVIRONMENT

Development should support:

- local server
- local database
- local clients
- two-room testing
- automated tests
- browser testing

Agents should be able to run the system without requiring unnecessary external services.

---

# 60. ENVIRONMENT CONFIGURATION

Use environment variables for environment-specific values.

Examples:

    PORT
    DATABASE_URL
    SESSION_SECRET
    ADMIN_SECRET
    NODE_ENV

Do not hardcode production secrets.

Maintain:

`.env.example`

with safe placeholders.

---

# 61. DEVELOPMENT VS PRODUCTION

Development may include:

- debug tools
- test data
- deterministic randomness
- verbose logging
- mock players

Production must not accidentally expose:

- debug endpoints
- test admin controls
- development credentials
- mock state
- test-only shortcuts
- secret information

Development-only functionality must be clearly isolated.

---

# 62. TESTABILITY

The architecture must allow testing of:

- game engine
- validation
- room isolation
- actions
- WebSockets
- persistence
- reconnection
- projector state
- player state
- admin authorization

The most important game rules should be testable without starting the entire application.

---

# 63. E2E ARCHITECTURE TEST

At minimum, the final system should support an automated scenario similar to:

    Start server
        |
    Create Room A
        |
    Create Room B
        |
    Join players
        |
    Start both games
        |
    Perform actions in Room A
        |
    Verify Room B unchanged
        |
    Perform actions in Room B
        |
    Verify Room A unchanged
        |
    Disconnect player
        |
    Reconnect player
        |
    Continue game
        |
    Finish game
        |
    Verify final state

---

# 64. OBSERVABILITY

During development and testing, it should be possible to understand:

- current room state
- active connections
- current game phase
- recent actions
- recent errors
- server health

Admin/diagnostic information must remain appropriately protected.

---

# 65. NO CLIENT-SIDE CHEAT CONTROLS

Do not rely on:

- disabling buttons
- hidden buttons
- hidden fields
- obscured JavaScript
- minification
- local storage restrictions

as security controls.

These are UX controls.

Actual enforcement belongs on the server.

---

# 66. NO DIRECT STATE MUTATION FROM UI

Frontend components should not directly modify authoritative game state.

Bad:

    player.credits -= 1000

Good:

    sendAction({
        type: "BUY_PROPERTY",
        propertyId
    })

The server then performs the actual state transition.

---

# 67. UI AND GAME ENGINE CONTRACT

The UI should consume well-defined data structures.

Avoid letting frontend components depend on internal implementation details of the game engine.

Use shared types/contracts where appropriate.

This allows:

- frontend agents
- backend agents
- QA agents

to work independently without inventing incompatible data structures.

---

# 68. SHARED TYPES

Shared types may include:

- player identifiers
- room identifiers
- property identifiers
- action types
- event types
- public state types
- private state types
- error types
- connection status

Do not put business logic into shared types merely for convenience.

---

# 69. ERROR CONTRACT

Server errors should use predictable machine-readable codes.

Conceptually:

    {
        code: "INVALID_TURN",
        message: "It is not your turn."
    }

The exact error catalog should be defined during implementation.

Clients should not need to parse arbitrary server prose to determine what happened.

---

# 70. BACKEND API CONTRACT

All APIs should be documented through code/types or appropriate API documentation.

Before changing a public contract:

1. inspect all consumers
2. update shared types
3. update server
4. update clients
5. update tests
6. verify backwards compatibility where necessary

Do not silently change payload structure.

---

# 71. DATABASE MIGRATIONS

Database schema changes should be made through controlled migrations.

Do not manually modify production schema without recording the change.

Migration files should be versioned.

Never destroy production data as part of a normal development migration.

---

# 72. DEPENDENCY DIRECTION

Prefer:

    UI
     |
     v
    Application/API layer
     |
     v
    Game Engine
     |
     v
    Persistence

Avoid:

    UI
      |
      +---- direct database access
      |
      +---- duplicated gameplay rules

The browser must never directly connect to PostgreSQL.

---

# 73. FILE OWNERSHIP

When practical, keep responsibilities separated.

Examples:

    game-engine/
        rules
        state
        actions
        events

    server/
        transport
        rooms
        sessions
        APIs

    client/
        screens
        components
        state
        networking

    projector/
        public screens
        animations
        rendering

    admin/
        administration
        diagnostics

The exact naming is implementation-dependent.

---

# 74. FRONTEND DESIGN SYSTEM

All major frontend surfaces should use a shared design system.

Shared elements may include:

- typography
- buttons
- cards
- panels
- badges
- notifications
- modals
- transitions
- icons
- spacing

Do not create separate visual languages for player, projector, and admin surfaces.

They should feel like the same product.

---

# 75. VISUAL PERFORMANCE

The visual system must be designed around actual event hardware.

Assume that the game may run on ordinary university laptops/projectors and a range of mobile phones.

Do not require high-end hardware.

The application should remain usable when:

- hardware is modest
- network conditions are imperfect
- multiple clients are connected
- projector resolution differs

---

# 76. MOBILE-FIRST PLAYER INTERFACE

Player clients should be designed for touch.

Avoid relying on:

- hover
- right click
- keyboard shortcuts
- tiny controls

unless they are optional enhancements.

Critical actions must work with touch.

---

# 77. PROJECTOR RESOLUTION

The projector client should be designed around a stable presentation resolution, with responsive handling for reasonable alternatives.

The exact event resolution should be determined during testing.

Visual hierarchy must remain strong at a distance.

---

# 78. ANIMATION ARCHITECTURE

Animations should be driven by state/events rather than arbitrary timers whenever possible.

Example:

    SERVER EVENT
         |
         v
    PROPERTY_PURCHASED
         |
         v
    PROJECTOR ANIMATION
         |
         v
    UPDATED PUBLIC STATE

Do not let animation state become authoritative game state.

---

# 79. NO GAMEPLAY DURING BROKEN VISUAL STATE

If an animation fails:

- gameplay must continue
- authoritative state must remain correct
- clients should recover to the current state

Visual rendering is downstream from game state.

---

# 80. ADMIN EMERGENCY OPERATIONS

Emergency controls should be designed to minimize accidental misuse.

Potential controls may require:

- confirmation
- explicit target
- clear explanation
- audit logging

Never make destructive operations one accidental click away without appropriate safeguards.

---

# 81. AUDITABILITY

Important administrative and game-state transitions should be traceable where appropriate.

This is particularly useful for:

- debugging
- resolving disputes
- investigating unexpected results
- event-day recovery

Do not collect unnecessary personal information.

---

# 82. DATA MINIMIZATION

Only collect information required for the game.

Players should not need unnecessary:

- email addresses
- phone numbers
- passwords
- personal profiles

unless a future requirement explicitly introduces them.

A simple event identity should generally be preferred.

---

# 83. NO EXTERNAL DEPENDENCY DURING CORE GAMEPLAY

The core game should not require:

- third-party APIs
- external AI APIs
- external analytics
- external content services

during normal gameplay unless explicitly approved.

The event should remain functional if an unrelated external service becomes unavailable.

---

# 84. LOGIC OWNERSHIP

The following ownership model should be maintained:

## Game rules

`game-engine`

## Networking

`server`

## Persistence

`server/database`

## Visual rendering

`client/projector/admin`

## Authentication

`server`

## Validation

`validation/server`

## User interaction

`client`

This prevents logic from becoming scattered.

---

# 85. ARCHITECTURAL CHANGE PROCESS

A major architectural change requires:

1. Identify the problem.
2. Explain the proposed change.
3. Identify affected components.
4. Identify risks.
5. Update `ARCHITECTURE.md`.
6. Update `DECISIONS.md`.
7. Implement.
8. Test.
9. Review.

Do not silently change foundational architecture.

---

# 86. WHEN TO CHOOSE SIMPLICITY

If two architectures provide essentially the same result:

Choose the simpler one.

Prefer:

- fewer moving parts
- fewer dependencies
- fewer services
- clearer ownership
- easier testing
- easier recovery

This project is an event game, not a hyperscale platform.

---

# 87. WHEN TO INTRODUCE COMPLEXITY

Complexity is justified when it directly improves:

- correctness
- security
- reliability
- performance
- maintainability

It must have a measurable or clear benefit.

Do not introduce architecture merely because it is common in large companies.

---

# 88. EVENT-DAY ARCHITECTURAL PRIORITY

During the live event:

1. Preserve authoritative game state.
2. Keep games running.
3. Preserve room isolation.
4. Maintain player connectivity.
5. Maintain projector display.
6. Recover disconnected players.
7. Preserve final results.
8. Preserve visual quality.

Avoid risky architectural changes immediately before the event.

---

# 89. FEATURE FREEZE

Before the event, the project should enter a feature freeze.

After feature freeze:

Allowed:

- critical bug fixes
- security fixes
- performance fixes
- reliability fixes
- visual fixes that do not affect gameplay

Avoid:

- new mechanics
- major architecture changes
- large dependencies
- experimental features

unless explicitly approved.

---

# 90. FINAL ARCHITECTURAL PRINCIPLE

ECONOVA: CITY should behave as:

    ONE AUTHORITATIVE GAME
             |
       ┌─────┴─────┐
       |           |
    ROOM A       ROOM B
       |           |
   PROJECTOR    PROJECTOR
       |           |
    PLAYERS      PLAYERS

The clients are interfaces.

The server is the authority.

The game engine contains the rules.

The database provides persistence.

WebSockets provide realtime communication.

The projector provides the public spectacle.

The player client provides private interaction.

The admin client provides controlled operations.

The architecture should remain simple, deterministic, secure, fast, and recoverable.

Any implementation decision that conflicts with these principles must be explicitly reviewed and documented.

END OF ARCHITECTURE.md
