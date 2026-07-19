# CycleTracker

A native iOS app to track cycling rides — live speed, distance, and (from Phase 2)
heart rate — with a history view for tracking progression over time. Built in
Swift/SwiftUI. Designed for personal sideload install via Xcode.

## Status: Phase 2 — Watch companion + live heart rate

What works now:

- **Live Ride tab** — Start / Pause / Resume / Finish a ride, with big glanceable
  tiles for current **speed** (km/h), **distance** (km), elapsed **time**, and
  live **heart rate** (bpm) streamed from the Apple Watch.
- **GPS tracking** via Core Location, tuned for cycling (best-for-navigation
  accuracy, `.fitness` activity type). Background location mode is enabled so
  tracking keeps running with the screen locked / phone in a pocket.
- **Apple Watch companion** — runs an `HKWorkoutSession` (cycling) so heart rate
  is measured continuously and the watch app stays alive in the background. Each
  reading is streamed to the phone over WatchConnectivity, shown live, and saved
  into the ride's samples (which feed the avg/max HR stored on each ride).
- **Local storage** with SwiftData — every finished ride is saved with its
  summary stats and the underlying per-second samples (location, speed, HR).
- **History tab** — reverse-chronological list of past rides with a "this week"
  distance/count summary, plus max HR per ride. Swipe to delete.

Not yet built (later phases): Siri voice queries, weekly/monthly charts, and the
resting/max HR + VO2max trends.

### How the phone ↔ watch handoff works

When you tap **Start** on the phone, it asks the watch to launch its workout
(via `HKHealthStore.startWatchApp(with:)`) and sends a `startRide` command over
WatchConnectivity; the watch begins an `HKWorkoutSession` and streams heart rate
back. Tapping **Finish** sends `stopRide`.

> **Reliability note:** phone-initiated launch of the watch app is best-effort —
> iOS doesn't always guarantee it. For rock-solid heart rate, open the
> **CycleTracker** app on the watch (or tap its **Start**) before or right after
> starting the ride on the phone. The watch's own Start/Stop button always works
> independently. This is the main thing to validate on a real ride.

## Requirements

- **Xcode 16 or newer** (the project uses file-system-synchronized groups and
  SwiftData). Deployment target is **iOS 17.0**.
- A physical iPhone for real GPS. The Simulator can fake a route via
  *Features ▸ Location ▸ City Bicycle Ride*, which is enough to see the metrics
  move.
- A physical **Apple Watch paired to that iPhone** for heart rate. HealthKit
  heart rate isn't available in the Simulator, so the HR tile only comes alive on
  real hardware. Select the **CycleTracker** scheme and build once with the iPhone
  as destination — Xcode installs the embedded watch app onto the paired watch.

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
├─ Shared/
│  └─ WatchMessage.swift          # Phone↔watch message contract (both targets)
├─ CycleTracker/                  # iOS app target
│  ├─ CycleTrackerApp.swift       # App entry point, SwiftData container wiring
│  ├─ Info.plist                  # Location + Health usage strings, background mode
│  ├─ CycleTracker.entitlements   # HealthKit capability
│  ├─ Models/
│  │  ├─ Ride.swift               # Saved ride + summary stats
│  │  └─ RideSample.swift         # Per-second GPS/HR sample
│  ├─ Services/
│  │  ├─ LocationManager.swift    # CLLocationManager wrapper, cycling-tuned
│  │  ├─ RideSessionManager.swift # Ride state machine + persistence
│  │  └─ WatchConnectivityManager.swift # Phone side of the watch link
│  ├─ Utilities/
│  │  └─ Formatters.swift         # Unit conversions & display formatting
│  └─ Views/
│     ├─ RootView.swift           # Tab layout
│     ├─ LiveRideView.swift       # Live metrics + controls
│     ├─ HistoryView.swift        # Ride history list + weekly summary
│     └─ Components/MetricTile.swift
└─ CycleTrackerWatch/             # watchOS app target
   ├─ CycleTrackerWatchApp.swift  # Watch app entry point
   ├─ WorkoutManager.swift        # HKWorkoutSession + HR streaming
   ├─ ContentView.swift           # Watch UI (live HR + Start/Stop)
   ├─ Info.plist                  # WKApplication + Health usage strings
   └─ CycleTrackerWatch.entitlements # HealthKit capability
```

Because each folder is a synchronized group, **new `.swift` files added under
`CycleTracker/`, `CycleTrackerWatch/`, or `Shared/` are picked up automatically** —
no need to edit the project file as later phases add sources.

## Roadmap

| Phase | Scope |
|------:|-------|
| **1** ✅ | Core GPS ride tracking, local storage, Live + History UI |
| **2** ✅ | watchOS companion + live heart-rate streaming |
| 3 | Siri App Intents for spoken speed / distance / heart-rate |
| 4 | Weekly & monthly progression charts |
| 5 | Resting HR / max HR tracking + VO2max (Uth–Sørensen formula + Apple estimate) |
| 6 | Route map, iCloud backup, battery/accuracy tuning |
