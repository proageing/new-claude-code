# CycleTracker

A native iOS app to track cycling rides — live speed, distance, and (from Phase 2)
heart rate — with a history view for tracking progression over time. Built in
Swift/SwiftUI. Designed for personal sideload install via Xcode.

## Status: Phase 1 — Core ride tracking

What works now:

- **Live Ride tab** — Start / Pause / Resume / Finish a ride, with big glanceable
  tiles for current **speed** (km/h), **distance** (km), and elapsed **time**. The
  heart-rate tile is present but shows `—` until the Watch companion lands in
  Phase 2.
- **GPS tracking** via Core Location, tuned for cycling (best-for-navigation
  accuracy, `.fitness` activity type). Background location mode is enabled so
  tracking keeps running with the screen locked / phone in a pocket.
- **Local storage** with SwiftData — every finished ride is saved with its
  summary stats and the underlying per-second samples (location + speed), so
  routes and richer stats can be rebuilt later.
- **History tab** — reverse-chronological list of past rides with a "this week"
  distance/count summary. Swipe to delete.

Not yet built (later phases): Watch companion + live heart rate, Siri voice
queries, weekly/monthly charts, and the resting/max HR + VO2max trends.

## Requirements

- **Xcode 16 or newer** (the project uses file-system-synchronized groups and
  SwiftData). Deployment target is **iOS 17.0**.
- A physical iPhone for real GPS. The Simulator can fake a route via
  *Features ▸ Location ▸ City Bicycle Ride*, which is enough to see the metrics
  move.

## Build & run (personal sideload)

1. Open `CycleTracker.xcodeproj` in Xcode.
2. Select the **CycleTracker** scheme and your iPhone as the run destination.
3. In **Signing & Capabilities**, set **Team** to your personal Apple ID and let
   Xcode manage signing automatically. (The bundle id defaults to
   `sg.proage.CycleTracker` — change it if Xcode reports it's taken.)
4. Press **Run**. On the phone, grant **location "While Using the App"** when
   prompted.

> **Free Apple ID note:** a sideloaded build signed with a free Apple ID expires
> after 7 days and must be rebuilt from Xcode. A paid Apple Developer account
> ($99/yr) extends this to a year.

## Project layout

```
CycleTracker/
├─ CycleTracker.xcodeproj/        # Xcode project (synchronized-folder based)
└─ CycleTracker/
   ├─ CycleTrackerApp.swift       # App entry point, SwiftData container wiring
   ├─ Info.plist                  # Location usage string + background location mode
   ├─ Models/
   │  ├─ Ride.swift               # Saved ride + summary stats
   │  └─ RideSample.swift         # Per-second GPS/HR sample
   ├─ Services/
   │  ├─ LocationManager.swift    # CLLocationManager wrapper, cycling-tuned
   │  └─ RideSessionManager.swift # Ride state machine + persistence
   ├─ Utilities/
   │  └─ Formatters.swift         # Unit conversions & display formatting
   └─ Views/
      ├─ RootView.swift           # Tab layout
      ├─ LiveRideView.swift       # Live metrics + controls
      ├─ HistoryView.swift        # Ride history list + weekly summary
      └─ Components/MetricTile.swift
```

Because the project uses a synchronized folder group, **new `.swift` files added
under `CycleTracker/` are picked up automatically** — no need to edit the project
file as later phases add sources.

## Roadmap

| Phase | Scope |
|------:|-------|
| **1** ✅ | Core GPS ride tracking, local storage, Live + History UI |
| 2 | watchOS companion + live heart-rate streaming |
| 3 | Siri App Intents for spoken speed / distance / heart-rate |
| 4 | Weekly & monthly progression charts |
| 5 | Resting HR / max HR tracking + VO2max (Uth–Sørensen formula + Apple estimate) |
| 6 | Route map, iCloud backup, battery/accuracy tuning |
