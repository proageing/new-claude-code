import Foundation

/// An immutable snapshot of the current ride's live metrics.
struct RideSnapshot: Codable, Sendable {
    var isRiding: Bool
    var speedMetersPerSecond: Double
    var distanceMeters: Double
    var heartRate: Double?
    var updatedAt: Date

    static let empty = RideSnapshot(
        isRiding: false,
        speedMetersPerSecond: 0,
        distanceMeters: 0,
        heartRate: nil,
        updatedAt: .distantPast
    )
}

/// Process-wide, thread-safe holder for the latest ride snapshot.
///
/// Siri App Intents run off the main actor — sometimes in a process Siri spawns in
/// the background — so they can't safely reach into the main-actor
/// `RideSessionManager`. Instead the session *publishes* snapshots here, and the
/// intents *read* them. The snapshot is mirrored to `UserDefaults` so a freshly
/// launched process still has the last-known values.
final class LiveRideStore: @unchecked Sendable {
    static let shared = LiveRideStore()

    private let lock = NSLock()
    private var snapshot: RideSnapshot
    private let defaultsKey = "live_ride_snapshot"

    private init() {
        if let data = UserDefaults.standard.data(forKey: defaultsKey),
           let decoded = try? JSONDecoder().decode(RideSnapshot.self, from: data) {
            snapshot = decoded
        } else {
            snapshot = .empty
        }
    }

    func update(_ snapshot: RideSnapshot) {
        lock.lock()
        self.snapshot = snapshot
        lock.unlock()
        if let data = try? JSONEncoder().encode(snapshot) {
            UserDefaults.standard.set(data, forKey: defaultsKey)
        }
    }

    var current: RideSnapshot {
        lock.lock()
        defer { lock.unlock() }
        return snapshot
    }
}
