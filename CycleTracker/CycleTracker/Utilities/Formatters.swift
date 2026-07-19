import Foundation

/// Unit conversions. Phase 1 presents metric units; a user-facing unit toggle can
/// come later without touching the stored values (always SI: meters, m/s, seconds).
enum Units {
    static func kmh(fromMetersPerSecond mps: Double) -> Double { mps * 3.6 }
    static func km(fromMeters meters: Double) -> Double { meters / 1000 }
}

/// String formatting for ride metrics shown in the UI.
enum RideFormatters {
    static func speed(_ mps: Double) -> String {
        String(format: "%.1f", Units.kmh(fromMetersPerSecond: mps))
    }

    static func distance(_ meters: Double) -> String {
        String(format: "%.2f", Units.km(fromMeters: meters))
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60
        return hours > 0
            ? String(format: "%d:%02d:%02d", hours, minutes, secs)
            : String(format: "%02d:%02d", minutes, secs)
    }

    static func heartRate(_ bpm: Double?) -> String {
        guard let bpm else { return "—" }
        return String(format: "%.0f", bpm)
    }

    private static let dateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    static func dateTime(_ date: Date) -> String {
        dateTimeFormatter.string(from: date)
    }
}
