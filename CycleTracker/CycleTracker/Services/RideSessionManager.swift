import Foundation
import CoreLocation
import SwiftData
import Observation

enum RideState {
    case idle
    case recording
    case paused
}

/// Owns the live ride state machine: accumulates distance/speed/time from GPS,
/// exposes observable metrics to the UI, and persists a `Ride` on stop.
///
/// Heart rate (`currentHeartRate`) is a placeholder in Phase 1 and will be fed by
/// the Watch companion in Phase 2 — the persistence path already records it.
@MainActor
@Observable
final class RideSessionManager {
    // MARK: Observable live metrics
    private(set) var state: RideState = .idle
    private(set) var distanceMeters: Double = 0
    private(set) var currentSpeedMetersPerSecond: Double = 0
    private(set) var maxSpeedMetersPerSecond: Double = 0
    private(set) var elapsedSeconds: TimeInterval = 0
    var currentHeartRate: Double?

    /// Mirrored from `LocationManager` so SwiftUI re-renders on permission changes.
    private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined

    // MARK: Dependencies / internal state
    private let locationManager = LocationManager()
    private let watch = WatchConnectivityManager()
    private var modelContext: ModelContext?

    private var startDate: Date?
    private var lastLocation: CLLocation?
    /// Time banked from completed (paused) segments; the live segment is added on top.
    private var accumulatedSeconds: TimeInterval = 0
    private var segmentStart: Date?
    private var timer: Timer?

    private struct RawSample {
        let date: Date
        let coordinate: CLLocationCoordinate2D
        let speed: Double
        let heartRate: Double?
    }
    private var samples: [RawSample] = []

    // MARK: Setup

    func configure(context: ModelContext) {
        self.modelContext = context
        authorizationStatus = locationManager.authorizationStatus
        locationManager.authorizationHandler = { [weak self] status in
            self?.authorizationStatus = status
        }
        // Live heart rate streamed from the Watch companion (Phase 2).
        watch.heartRateHandler = { [weak self] bpm in
            self?.currentHeartRate = bpm
            self?.publishSnapshot()
        }
        publishSnapshot()
    }

    func requestAuthorization() {
        locationManager.requestAuthorization()
    }

    // MARK: Controls

    func start() {
        guard state == .idle else { return }
        resetMetrics()
        startDate = Date()
        state = .recording
        locationManager.locationHandler = { [weak self] location in
            self?.handle(location)
        }
        startTimer()
        locationManager.startUpdates(background: true)
        watch.startRide()
        publishSnapshot()
    }

    func pause() {
        guard state == .recording else { return }
        state = .paused
        bankElapsed()
        stopTimer()
        locationManager.stopUpdates()
        currentSpeedMetersPerSecond = 0
        lastLocation = nil
        publishSnapshot()
    }

    func resume() {
        guard state == .paused else { return }
        state = .recording
        startTimer()
        locationManager.startUpdates(background: true)
        publishSnapshot()
    }

    /// Finalizes and persists the ride. Returns the saved `Ride`, or nil if idle.
    @discardableResult
    func stop() -> Ride? {
        guard state != .idle, let start = startDate else { return nil }
        bankElapsed()
        stopTimer()
        locationManager.stopUpdates()
        locationManager.locationHandler = nil
        watch.stopRide()

        let ride = Ride(
            startDate: start,
            endDate: Date(),
            distanceMeters: distanceMeters,
            movingTimeSeconds: accumulatedSeconds,
            maxSpeedMetersPerSecond: maxSpeedMetersPerSecond
        )

        let hrValues = samples.compactMap { $0.heartRate }
        if !hrValues.isEmpty {
            ride.avgHeartRate = hrValues.reduce(0, +) / Double(hrValues.count)
            ride.maxHeartRate = hrValues.max()
        }

        if let context = modelContext {
            context.insert(ride)
            for sample in samples {
                let record = RideSample(
                    timestamp: sample.date,
                    latitude: sample.coordinate.latitude,
                    longitude: sample.coordinate.longitude,
                    speedMetersPerSecond: sample.speed,
                    heartRate: sample.heartRate
                )
                record.ride = ride
                context.insert(record)
            }
            try? context.save()
        }

        resetMetrics()
        state = .idle
        publishSnapshot()
        return ride
    }

    /// Abandons the in-progress ride without saving.
    func discard() {
        stopTimer()
        locationManager.stopUpdates()
        locationManager.locationHandler = nil
        watch.stopRide()
        resetMetrics()
        state = .idle
        publishSnapshot()
    }

    // MARK: Location handling

    private func handle(_ location: CLLocation) {
        guard state == .recording else { return }
        // Reject fixes with no/poor horizontal accuracy.
        guard location.horizontalAccuracy >= 0, location.horizontalAccuracy < 50 else { return }

        // Prefer the GPS-reported instantaneous speed; fall back to deriving it
        // from the distance/time between fixes when it's unavailable (negative).
        let speed: Double
        if location.speed >= 0 {
            speed = location.speed
        } else if let last = lastLocation {
            let dt = location.timestamp.timeIntervalSince(last.timestamp)
            speed = dt > 0 ? location.distance(from: last) / dt : 0
        } else {
            speed = 0
        }
        currentSpeedMetersPerSecond = max(speed, 0)
        maxSpeedMetersPerSecond = max(maxSpeedMetersPerSecond, currentSpeedMetersPerSecond)

        if let last = lastLocation {
            let delta = location.distance(from: last)
            // Ignore jitter (smaller than our accuracy) and implausible jumps.
            let noiseFloor = max(location.horizontalAccuracy, 2)
            if delta.isFinite, delta > noiseFloor, delta < 200 {
                distanceMeters += delta
            }
        }
        lastLocation = location

        samples.append(RawSample(
            date: location.timestamp,
            coordinate: location.coordinate,
            speed: currentSpeedMetersPerSecond,
            heartRate: currentHeartRate
        ))
    }

    // MARK: Timing

    private func startTimer() {
        segmentStart = Date()
        let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.tick() }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard let segmentStart else { return }
        elapsedSeconds = accumulatedSeconds + Date().timeIntervalSince(segmentStart)
        publishSnapshot()
    }

    // MARK: Live snapshot (for Siri App Intents)

    /// Publishes the current metrics to the process-wide `LiveRideStore` so Siri
    /// intents can read them off the main actor. A paused ride still counts as
    /// "riding" so Siri reports distance/heart rate rather than "not on a ride".
    private func publishSnapshot() {
        LiveRideStore.shared.update(RideSnapshot(
            isRiding: state != .idle,
            speedMetersPerSecond: currentSpeedMetersPerSecond,
            distanceMeters: distanceMeters,
            heartRate: currentHeartRate,
            updatedAt: Date()
        ))
    }

    private func bankElapsed() {
        if let segmentStart {
            accumulatedSeconds += Date().timeIntervalSince(segmentStart)
        }
        segmentStart = nil
        elapsedSeconds = accumulatedSeconds
    }

    private func resetMetrics() {
        distanceMeters = 0
        currentSpeedMetersPerSecond = 0
        maxSpeedMetersPerSecond = 0
        elapsedSeconds = 0
        accumulatedSeconds = 0
        segmentStart = nil
        lastLocation = nil
        startDate = nil
        samples.removeAll()
        currentHeartRate = nil
    }
}
