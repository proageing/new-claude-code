import Foundation

/// Turns a `RideSnapshot` into natural spoken sentences for Siri to read aloud
/// (through AirPods while riding). Kept separate from the intents so the phrasing
/// is easy to tweak in one place.
enum SpokenRide {
    private static let notRiding = "You're not on a ride right now."

    static func speed(for snapshot: RideSnapshot) -> String {
        guard snapshot.isRiding else { return notRiding }
        let kmh = Units.kmh(fromMetersPerSecond: snapshot.speedMetersPerSecond)
        return String(format: "Your speed is %.0f kilometers per hour.", kmh)
    }

    static func distance(for snapshot: RideSnapshot) -> String {
        guard snapshot.isRiding else { return notRiding }
        let km = Units.km(fromMeters: snapshot.distanceMeters)
        return String(format: "You've covered %.1f kilometers.", km)
    }

    static func heartRate(for snapshot: RideSnapshot) -> String {
        guard snapshot.isRiding else { return notRiding }
        guard let hr = snapshot.heartRate, hr > 0 else {
            return "I don't have a heart rate reading right now."
        }
        return String(format: "Your heart rate is %.0f beats per minute.", hr)
    }

    /// All three metrics in one sentence.
    static func status(for snapshot: RideSnapshot) -> String {
        guard snapshot.isRiding else { return notRiding }
        return [speed(for: snapshot), distance(for: snapshot), heartRate(for: snapshot)]
            .joined(separator: " ")
    }
}
