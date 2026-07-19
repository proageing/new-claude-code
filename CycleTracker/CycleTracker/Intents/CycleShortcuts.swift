import AppIntents

/// Registers the spoken phrases Siri recognizes for each intent. Apple requires
/// every phrase to contain the app-name token `\(.applicationName)`, so users say,
/// e.g., "CycleTracker speed" or "What's my speed in CycleTracker".
struct CycleShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RideStatusIntent(),
            phrases: [
                "\(.applicationName) status",
                "\(.applicationName) ride status",
                "What's my status in \(.applicationName)",
                "How's my ride in \(.applicationName)"
            ],
            shortTitle: "Ride Status",
            systemImageName: "bicycle"
        )
        AppShortcut(
            intent: CurrentSpeedIntent(),
            phrases: [
                "\(.applicationName) speed",
                "What's my speed in \(.applicationName)",
                "How fast am I going in \(.applicationName)"
            ],
            shortTitle: "Current Speed",
            systemImageName: "speedometer"
        )
        AppShortcut(
            intent: CurrentDistanceIntent(),
            phrases: [
                "\(.applicationName) distance",
                "How far have I gone in \(.applicationName)"
            ],
            shortTitle: "Distance",
            systemImageName: "arrow.triangle.swap"
        )
        AppShortcut(
            intent: CurrentHeartRateIntent(),
            phrases: [
                "\(.applicationName) heart rate",
                "What's my heart rate in \(.applicationName)"
            ],
            shortTitle: "Heart Rate",
            systemImageName: "heart.fill"
        )
    }
}
