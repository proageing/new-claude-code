import AppIntents

/// Triggered by Siri (e.g. "Hey Siri, get my stats") over AirPods. Runs
/// without opening the app and has Siri speak the result out loud.
struct GetWorkoutStatsIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Workout Stats"
    static var description = IntentDescription("Reads your current heart rate and speed from your in-progress Apple Watch workout.")
    static var openAppWhenRun: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            try await HealthKitManager.shared.requestAuthorization()
            let stats = try await HealthKitManager.shared.fetchLatestStats()
            return .result(dialog: IntentDialog(stringLiteral: spokenSummary(for: stats)))
        } catch {
            return .result(dialog: "I couldn't read your workout data. Make sure a workout is active on your Apple Watch and Health access is allowed.")
        }
    }

    private func spokenSummary(for stats: HealthKitManager.Stats) -> String {
        guard stats.hasActiveWorkout else {
            return "I don't see an active workout right now."
        }

        var parts: [String] = []
        if let heartRate = stats.heartRate {
            parts.append("your heart rate is \(Int(heartRate.rounded())) beats per minute")
        }
        if let speed = stats.speed {
            let mph = speed * 2.23694
            parts.append("your speed is \(String(format: "%.1f", mph)) miles per hour")
        }

        guard !parts.isEmpty else {
            return "I don't have recent heart rate or speed data yet."
        }
        let sentence = parts.joined(separator: ", and ") + "."
        return sentence.prefix(1).uppercased() + sentence.dropFirst()
    }
}
