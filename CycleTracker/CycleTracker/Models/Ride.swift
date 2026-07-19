import Foundation
import SwiftData

/// A single completed cycling ride and its summary statistics.
///
/// Live samples (GPS points, per-second heart rate) are stored in the related
/// `RideSample` records so we can redraw a route or recompute aggregates later.
@Model
final class Ride {
    var id: UUID = UUID()
    var startDate: Date = Date()
    var endDate: Date?

    /// Total distance covered, in meters.
    var distanceMeters: Double = 0
    /// Time spent actually moving (excludes paused segments), in seconds.
    var movingTimeSeconds: Double = 0
    /// Peak speed observed during the ride, in meters per second.
    var maxSpeedMetersPerSecond: Double = 0

    /// Heart-rate aggregates. Populated once the Watch companion streams HR
    /// (Phase 2); nil for GPS-only rides recorded in Phase 1.
    var avgHeartRate: Double?
    var maxHeartRate: Double?

    @Relationship(deleteRule: .cascade, inverse: \RideSample.ride)
    var samples: [RideSample] = []

    init(
        startDate: Date,
        endDate: Date?,
        distanceMeters: Double,
        movingTimeSeconds: Double,
        maxSpeedMetersPerSecond: Double
    ) {
        self.id = UUID()
        self.startDate = startDate
        self.endDate = endDate
        self.distanceMeters = distanceMeters
        self.movingTimeSeconds = movingTimeSeconds
        self.maxSpeedMetersPerSecond = maxSpeedMetersPerSecond
    }

    /// Average speed over the moving time, in meters per second.
    var averageSpeedMetersPerSecond: Double {
        movingTimeSeconds > 0 ? distanceMeters / movingTimeSeconds : 0
    }
}
