import Foundation
import SwiftData

/// A single point-in-time reading captured during a ride: location, speed, and
/// (once the Watch is streaming) heart rate. Used to redraw routes and recompute
/// aggregates after the fact.
@Model
final class RideSample {
    var timestamp: Date = Date()
    var latitude: Double = 0
    var longitude: Double = 0
    var speedMetersPerSecond: Double = 0
    var heartRate: Double?

    var ride: Ride?

    init(
        timestamp: Date,
        latitude: Double,
        longitude: Double,
        speedMetersPerSecond: Double,
        heartRate: Double?
    ) {
        self.timestamp = timestamp
        self.latitude = latitude
        self.longitude = longitude
        self.speedMetersPerSecond = speedMetersPerSecond
        self.heartRate = heartRate
    }
}
