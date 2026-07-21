import AppIntents

/// Registers the voice phrases Siri listens for. Once installed, these work
/// system-wide via "Hey Siri" through any connected audio device, including
/// AirPods Pro, with no need to unlock or open the app.
struct WorkoutVoiceStatsShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GetWorkoutStatsIntent(),
            phrases: [
                "Get my stats with \(.applicationName)",
                "What's my heart rate in \(.applicationName)",
                "\(.applicationName) read my stats"
            ],
            shortTitle: "Workout Stats",
            systemImageName: "waveform.path.ecg"
        )
    }
}
