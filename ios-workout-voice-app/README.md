# Workout Voice Stats

An iPhone app that reads your current heart rate and speed out loud — triggered
hands-free with "Hey Siri" through your AirPods Pro — while you're on an Apple
Watch workout.

## How it works

- Apple's stock Workout app on your Watch continuously syncs heart rate, and
  (for outdoor run/cycle workouts on watchOS 10+) running/cycling speed, to
  HealthKit every few seconds while a workout is active.
- This app reads the latest of those HealthKit samples on demand.
- It registers an **App Intent** with a Siri phrase ("Get my stats"). When you
  say it, Siri runs the intent in the background — no unlock, no opening the
  app — and speaks the result through whatever audio device is active,
  including AirPods Pro.
- A simple on-screen "Refresh & Speak" button is included too, for manual
  testing without Siri.

### Important limitation

Third-party apps cannot hook into the stock Workout app's *live* session —
Apple doesn't expose that. This app instead reads HealthKit's latest synced
samples, so there's a delay of a few seconds rather than a truly instantaneous
feed. That's the best available without replacing the Workout app with a
custom watchOS workout app of your own (a much bigger project).

Speed data specifically only populates for GPS-based Outdoor Run / Outdoor
Cycle workouts on watchOS 10+. Indoor workouts will still give you heart rate.

## Setup (you'll need a Mac with Xcode, and an Apple ID)

1. **Create the project.** In Xcode: File → New → Project → iOS → App.
   - Product Name: `WorkoutVoiceStats`
   - Interface: SwiftUI, Language: Swift
   - Minimum Deployment: iOS 17.0 (needed for `runningSpeed`/`cyclingSpeed` and
     the App Intents Siri dialog API)

2. **Add the source files.** Drag every file from this folder's `Sources/`
   directory into the Xcode project navigator (into the main app group),
   replacing the placeholder `ContentView.swift` and `WorkoutVoiceStatsApp.swift`
   Xcode generated. Make sure "Copy items if needed" is checked and the app
   target is selected.
   - `Info-additions.plist` and `WorkoutVoiceStats.entitlements` are reference
     files, not meant to be compiled — see steps 3–4 for what to do with them.

3. **Add Health usage descriptions.** Select the project → your target →
   **Info** tab → add these rows (values are in `Sources/Info-additions.plist`
   for reference):
   - `Privacy - Health Share Usage Description`
   - `Privacy - Health Update Usage Description`

4. **Add capabilities.** Select the project → your target → **Signing &
   Capabilities** → `+ Capability` → add **HealthKit**. Xcode will create/attach
   an entitlements file automatically; you can delete the reference
   `WorkoutVoiceStats.entitlements` in this repo once that's confirmed.

5. **Sign the app.** Under **Signing & Capabilities**, set your Team to your
   personal Apple ID (Xcode → Settings → Accounts to add one if needed). A
   free Apple ID works for installing to your own device — the app just needs
   reinstalling every 7 days unless you're in the paid Apple Developer Program.

6. **Install to your iPhone.** Connect it via cable or over Wi-Fi, select it as
   the run destination, and hit Run (⌘R). The first time, you'll need to
   trust the developer certificate on the phone: Settings → General → VPN &
   Device Management → trust your Apple ID.

7. **Grant Health access.** Open the app once on your phone and tap
   "Refresh & Speak" — this triggers the HealthKit permission prompt. Allow
   read access to Heart Rate and Workouts (and Running/Cycling Speed if
   listed).

8. **Try it hands-free.** Start a workout on your Apple Watch (Outdoor Run
   works best, to get speed data), put your AirPods Pro in, and say:
   > "Hey Siri, get my stats"

   Siri should speak your current heart rate and speed back to you. The exact
   phrase Siri recognizes is built from the App Shortcut phrases in
   `AppShortcuts.swift` combined with your app's name — after first install,
   check the Shortcuts app's "Workout Voice Stats" entry to see/adjust the
   exact recognized phrasing, or add your own custom phrase there.

## Files

| File | Purpose |
|---|---|
| `Sources/WorkoutVoiceStatsApp.swift` | App entry point |
| `Sources/ContentView.swift` | Manual UI with a Refresh & Speak button (uses `AVSpeechSynthesizer` directly) |
| `Sources/HealthKitManager.swift` | Reads latest heart rate / speed samples and whether a workout is active |
| `Sources/GetWorkoutStatsIntent.swift` | The App Intent Siri runs; returns a spoken `IntentDialog` |
| `Sources/AppShortcuts.swift` | Registers the Siri trigger phrases |
| `Sources/Info-additions.plist` | Reference for the Info.plist keys to add in Xcode |
| `Sources/WorkoutVoiceStats.entitlements` | Reference for the HealthKit entitlement Xcode generates |
