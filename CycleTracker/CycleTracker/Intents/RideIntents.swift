import AppIntents

/// Siri intents that speak the current ride metrics. None of them open the app —
/// they read the shared `LiveRideStore` snapshot and return spoken dialog, so
/// Siri can answer hands-free through AirPods mid-ride.

struct RideStatusIntent: AppIntent {
    static var title: LocalizedStringResource = "Ride Status"
    static var description = IntentDescription("Speak your current speed, distance, and heart rate.")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let text = SpokenRide.status(for: LiveRideStore.shared.current)
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

struct CurrentSpeedIntent: AppIntent {
    static var title: LocalizedStringResource = "Current Speed"
    static var description = IntentDescription("Speak your current cycling speed.")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let text = SpokenRide.speed(for: LiveRideStore.shared.current)
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

struct CurrentDistanceIntent: AppIntent {
    static var title: LocalizedStringResource = "Current Distance"
    static var description = IntentDescription("Speak how far you've ridden.")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let text = SpokenRide.distance(for: LiveRideStore.shared.current)
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

struct CurrentHeartRateIntent: AppIntent {
    static var title: LocalizedStringResource = "Current Heart Rate"
    static var description = IntentDescription("Speak your current heart rate.")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let text = SpokenRide.heartRate(for: LiveRideStore.shared.current)
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}
