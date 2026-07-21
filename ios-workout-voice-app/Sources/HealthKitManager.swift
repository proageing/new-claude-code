import Foundation
import HealthKit

@MainActor
final class HealthKitManager {
    static let shared = HealthKitManager()

    private let store = HKHealthStore()
    private let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    private let runningSpeedType = HKQuantityType.quantityType(forIdentifier: .runningSpeed)!
    private let cyclingSpeedType = HKQuantityType.quantityType(forIdentifier: .cyclingSpeed)!
    private let distanceWalkingRunningType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!
    private let distanceCyclingType = HKQuantityType.quantityType(forIdentifier: .distanceCycling)!

    struct Stats {
        let heartRate: Double?   // beats per minute
        let speed: Double?       // meters per second
        let distance: Double?    // meters, summed over the current workout
        let hasActiveWorkout: Bool
    }

    private struct Sample {
        let value: Double
        let date: Date
    }

    enum HealthKitError: LocalizedError {
        case notAvailable
        var errorDescription: String? {
            switch self {
            case .notAvailable: return "Health data isn't available on this device."
            }
        }
    }

    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw HealthKitError.notAvailable }
        let readTypes: Set<HKObjectType> = [
            heartRateType, runningSpeedType, cyclingSpeedType,
            distanceWalkingRunningType, distanceCyclingType
        ]
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    /// Reads the most recent heart rate and speed samples HealthKit has received
    /// from the active Apple Watch workout (the stock Workout app syncs these
    /// every few seconds, so expect a short delay rather than a truly live feed).
    ///
    /// There's no HealthKit object for an in-progress workout (HKWorkout only
    /// exists once a workout ends), so "active" is inferred from freshness:
    /// a heart rate or speed sample within the last 30 seconds strongly implies
    /// a workout is currently running, since that cadence only happens then.
    func fetchLatestStats() async throws -> Stats {
        async let hr = fetchLatestSample(for: heartRateType, unit: HKUnit.count().unitDivided(by: .minute()))
        async let runSpeed = fetchLatestSample(for: runningSpeedType, unit: HKUnit.meter().unitDivided(by: .second()))
        async let cycleSpeed = fetchLatestSample(for: cyclingSpeedType, unit: HKUnit.meter().unitDivided(by: .second()))
        async let walkDistance = fetchSessionDistance(for: distanceWalkingRunningType)
        async let cycleDistance = fetchSessionDistance(for: distanceCyclingType)

        let (heartRate, running, cycling, walkMeters, cycleMeters) = try await (hr, runSpeed, cycleSpeed, walkDistance, cycleDistance)
        let speed = running ?? cycling
        let distance = [walkMeters, cycleMeters].compactMap { $0 }.reduce(0, +)

        let recentThreshold = Date().addingTimeInterval(-30)
        let hasActiveWorkout = (heartRate?.date ?? .distantPast) > recentThreshold
            || (speed?.date ?? .distantPast) > recentThreshold

        return Stats(
            heartRate: heartRate?.value,
            speed: speed?.value,
            distance: distance > 0 ? distance : nil,
            hasActiveWorkout: hasActiveWorkout
        )
    }

    private func fetchLatestSample(for type: HKQuantityType, unit: HKUnit) async throws -> Sample? {
        try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: Date().addingTimeInterval(-5 * 60), end: nil, options: .strictStartDate)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sort]) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }
                continuation.resume(returning: Sample(value: sample.quantity.doubleValue(for: unit), date: sample.startDate))
            }
            store.execute(query)
        }
    }

    /// Distance samples are incremental deltas ("0.02 miles in the last 5
    /// seconds"), not a running total, so this sums just the current, unbroken
    /// run of samples. A gap longer than a couple of minutes means the
    /// previous workout ended and a new, unrelated period of samples began.
    private func fetchSessionDistance(for type: HKQuantityType) async throws -> Double? {
        try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: Date().addingTimeInterval(-6 * 60 * 60), end: nil, options: .strictStartDate)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }

                let sessionGapThreshold: TimeInterval = 2 * 60
                var total = 0.0
                var previousStart: Date?
                for sample in samples.reversed() {
                    if let previousStart, previousStart.timeIntervalSince(sample.endDate) > sessionGapThreshold {
                        break
                    }
                    total += sample.quantity.doubleValue(for: .meter())
                    previousStart = sample.startDate
                }
                continuation.resume(returning: total > 0 ? total : nil)
            }
            store.execute(query)
        }
    }
}
