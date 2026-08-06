# Flourish — Corporate Gamification Platform: Product & Technical Plan

A gamified engagement platform for corporate wellness, learning, team-building,
sustainability and compliance programs. Employees join **challenges** made up of
**activities**, verified through GPS check-ins, QR code scans, photo submissions
shared to a social **feed** (where liking posts is itself an activity),
camera-based exercise tracking, quizzes, and step counts. Teams compete on
leaderboards; organizations run branded programs with events and rewards.

Based on the Flourish deck (ProAge) and planning decisions made on 2026-08-06.

---

## 1. Confirmed decisions

| Decision | Choice |
|---|---|
| Platform | **PWA first, native (Expo) later** — architecture must keep the native path open |
| Tenancy | **Multi-tenant white-label** — each client org gets its own branding, users, challenges, leaderboards |
| Sign-in | **Corporate SSO** |
| MVP scope | Core challenge engine (QR, GPS, photo + feed likes) **plus** GPS tracking, camera-based exercise movement tracking, teams + leaderboards, events management |

## 2. Working assumptions (open questions — easy to change, please confirm)

These were asked but not yet answered; the plan proceeds on the recommended
defaults:

1. **Camera exercise tracking** → *Live rep counting on-device* (TensorFlow.js /
   MediaPipe pose estimation counts squats/jumping jacks/etc. in the browser;
   no video leaves the phone), with **video-submission-for-review as fallback**
   for unsupported exercises.
2. **GPS scope** → *Geofenced check-in* fully supported now; *distance/route
   tracking* included but foreground-only in the PWA (browsers suspend GPS when
   the screen locks). Background tracking arrives with the native app phase.
3. **SSO providers** → Support **both Microsoft Entra ID and Google Workspace**
   via a pluggable auth layer; each tenant enables the provider(s) they use.
   (An email + invite-code fallback is kept behind a per-tenant flag for pilots
   where IT setup lags.)
4. **Content management** → A **minimal internal admin panel** (ProAge staff):
   create/edit orgs, challenges, activities, events; generate/print QR codes;
   review photo & video submissions; export participation reports as CSV.
   A client-facing analytics portal is deferred.

---

## 3. Product model

### 3.1 Core concepts

- **Organization (tenant)** — a client company/program (e.g. "Great LIFE
  Programme", "Rajah & Tann"). Owns branding (logo, colors), users, challenges,
  events, and leaderboards. All data is partitioned by org.
- **Challenge** — a time-boxed program (event-day or year-long) containing an
  ordered/unordered set of activities, a points scheme, and a mode:
  **individual** or **team**. Has states: draft → scheduled → active → ended.
- **Activity** — a unit of participation inside a challenge, one of these
  verification types:
  | Type | Verification |
  |---|---|
  | `qr_scan` | Scan a challenge-specific QR code at a target location (signed payload, single-use per user) |
  | `gps_checkin` | Device is inside a geofence radius of a target coordinate |
  | `gps_distance` | Clock distance/steps over a set duration (foreground in PWA) |
  | `photo` | Capture/upload photo + caption → posts to feed → reviewer approval |
  | `feed_like` | Like N posts in the challenge feed (social loop: engagement completes an activity) |
  | `motion` | Camera pose-tracking counts exercise reps to a target |
  | `quiz` | Answer a custom question set, pass threshold |
  | `timed_unlock` | Bonus quest visible/completable only in a scheduled window (modifier on any type) |
- **Team** — created by a user within a team challenge; joinable via a
  case-sensitive **team code** or share link; creator auto-enrolled (per the
  deck's flow). Team progress = aggregate of member completions.
- **Feed** — per-challenge stream of approved photo/video posts with likes.
  Likes feed back into `feed_like` activities.
- **Points & leaderboard** — every verified completion writes to a points
  ledger; individual and team leaderboards per challenge plus an org-wide
  board. Streaks (day streak shown on the deck's home screen) tracked per user.
- **Event** — listed on home screen with date, online/onsite tag, registration,
  QR/geo attendance-taking, and post-event feedback form.
- **Submission review** — photo/video activities enter a review queue
  (approve/reject with reason); points award on approval.

### 3.2 User-facing screens (mirroring the deck mockups)

1. **Home** — org-branded header, greeting + avatar, stat chips (day streak /
   completed / total), upcoming **Events** carousel, **Challenges** cards
   (start date, description, sponsor logo), **Leaderboard** preview.
2. **Challenge detail** — tabs **Activities | Feed**; "How to Play"
   instructions; progress bar + participant count; team summary (code, invite
   link, member progress); activity cards with per-type actions (Sync, Check
   in, Scan, Submit, Join Now); "Nice work!" completion modal; Quit challenge.
3. **Feed** — photo posts with captions, like button, reviewer-approved only.
4. **Leaderboard** — "Your Ranking" banner + Top Performers list (individual /
   team toggle).
5. **Events** — list + detail, register, attendance scan, feedback.
6. **Profile/stats** — history, streaks, points, badges (badges = later phase).

### 3.3 Roles

- **Member** — employee participant.
- **Org admin** (later, client-facing) — reserved in the model now.
- **Platform admin** (ProAge staff) — full access via internal admin panel.
- **Reviewer** — submission-review permission (platform admin subset for MVP).

---

## 4. Architecture

### 4.1 Stack

- **App**: Next.js (App Router, TypeScript) as an installable **PWA** —
  one codebase for the member app and admin panel (`/admin`). Server actions +
  route handlers for the API; API layer kept transport-clean so the future
  Expo app can consume the same endpoints.
- **Database**: PostgreSQL + Prisma. Every row scoped by `orgId`; queries go
  through a tenant-scoped repository layer to prevent cross-tenant leaks.
- **Auth**: Auth.js with Microsoft Entra ID + Google providers; per-tenant
  provider config resolved by email domain / tenant slug; session JWTs carry
  `orgId` + role. Email magic-link behind a tenant flag.
- **Storage**: S3-compatible object storage for photos/videos (presigned
  uploads, server-side image resize, EXIF stripped).
- **Pose estimation**: TensorFlow.js **MoveNet** (or MediaPipe Pose) running
  fully on-device in a web worker; only rep counts/timestamps are submitted.
- **QR codes**: server-generated signed payloads (org + activity + nonce,
  HMAC), rendered as printable PDFs from the admin panel; scanned in-app via
  `BarcodeDetector` with a JS fallback library.
- **Geolocation**: browser Geolocation API; server validates reported
  coordinates against the geofence and applies plausibility checks (accuracy
  radius, speed between check-ins).
- **Realtime-ish**: polling/SWR for MVP (leaderboards, feed); no websockets
  needed yet.
- **Hosting**: Vercel (app) + managed Postgres (Neon/Supabase) + S3/R2 —
  swappable; nothing vendor-locked.

### 4.2 Anti-cheat posture (proportionate, not fortress)

- QR payloads signed + single-use per user per activity.
- GPS check-ins validated server-side with accuracy/speed sanity checks.
- Photo submissions human-reviewed before points and feed publication.
- `gps_distance` sync capped by plausible pace; native phase moves to
  HealthKit/Google Fit as source of truth.
- Motion tracking submits a rep timeline (not just a final count) so anomalies
  are detectable; suspicious completions flagged for review.

### 4.3 Data model (principal tables)

```
Organization(id, slug, name, branding{logo,colors}, ssoConfig, flags)
User(id, email, name, avatarUrl)
Membership(userId, orgId, role)
Challenge(id, orgId, title, description, mode[individual|team], startsAt,
          endsAt, sponsorLogo, state, pointsScheme)
Activity(id, challengeId, type, config{qrId|geofence|target|quizId|window...},
         points, sortOrder, unlockWindow?)
Team(id, challengeId, name, code, createdBy)
TeamMember(teamId, userId)
Enrollment(userId, challengeId, teamId?)
Completion(id, userId, activityId, status[pending|approved|rejected|verified],
           evidence{coords|qrNonce|mediaKey|repTimeline|quizScore},
           reviewedBy?, points, createdAt)
Post(id, challengeId, userId, mediaKey, caption, status, likeCount)
Like(postId, userId)
PointsLedger(id, orgId, userId, teamId?, challengeId, completionId, delta)
Event(id, orgId, title, startsAt, mode[online|onsite], venue?, capacity?)
EventRegistration(eventId, userId, status, attendedAt?, feedback?)
Streak(userId, orgId, current, best, lastActiveDate)
```

---

## 5. Build phases

**Phase 0 — Foundations (week 1)**
Project scaffold, PWA setup, Postgres + Prisma schema, multi-tenant plumbing
(org resolution by subdomain/slug, branding theming via CSS variables), SSO
sign-in for Entra ID + Google, seed script with a demo org.

**Phase 1 — Challenge engine (weeks 2–3)**
Home screen, challenge list/detail, enrollment, activity framework, and the
first verification types: `qr_scan`, `gps_checkin`, `photo` (upload → review
queue → feed post), `feed_like`, completion modal, points ledger, streaks.

**Phase 2 — Teams & leaderboards (week 4)**
Team create/join via code + share link, team progress rollup, individual and
team leaderboards, "Your Ranking" view.

**Phase 3 — Events (week 5)**
Event listing/detail, registration, QR attendance-taking, feedback collection.

**Phase 4 — Movement verification (weeks 6–7)**
`motion` activities with on-device rep counting (2–3 launch exercises:
squats, jumping jacks, arm raises) + video-review fallback; `gps_distance`
foreground tracking with sync button (per the deck's "Complete 1000 Steps"
card); `quiz` and `timed_unlock`.

**Phase 5 — Admin panel (week 8)**
Internal panel: org/branding CRUD, challenge & activity builder, QR PDF
generation, event management, submission review queue, CSV participation
exports.

**Phase 6 — Native phase (post-MVP)**
Expo wrapper reusing the API: push notifications, HealthKit/Google Fit step
sync (background), background GPS routes, app-store distribution. Rewards
redemption and client-facing analytics also live here unless pulled forward.

---

## 6. Explicitly deferred

- Rewards catalog/redemption (points ledger is built ready for it)
- Client-facing org-admin portal & analytics dashboards
- Badges/achievements, video posts in feed, comments on posts
- Push notifications (needs native or web-push; web-push is unreliable on iOS)
- Localization

## 7. Open questions for ProAge

1. Confirm the four working assumptions in §2 (motion tracking mode, GPS
   scope, SSO providers, admin panel depth).
2. Should this app live in this repository (it currently holds an unrelated
   BC proposal automation pipeline) or a fresh repo? Currently planned under
   `flourish/` here.
3. First pilot client/program and launch date — drives which activity types
   must be rock-solid first.
4. Data residency/PDPA requirements for photo storage (Singapore region
   hosting is assumed).
