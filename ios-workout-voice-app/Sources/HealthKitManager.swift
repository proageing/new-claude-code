import Foundation
import HealthKit

@MainActor
final class HealthKitManager {
    static let shared = HealthKitManager()

    private let store = HKHealthStore()
    private let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    private let runningSpeedType = HKQuantityType.quantityType(forIdentifier: .runningSpeed)!
    private let cyclingSpeedType = HKQuantityType.quantityType(forIdentifier: .cyclingSpeed)!

    struct Stats {
        let heartRate: Double?   // beats per minute
        let speed: Double?       // meters per second
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
        let readTypes: Set<HKObjectType> = [heartRateType, runningSpeedType, cyclingSpeedType]
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

        let (heartRate, running, cycling) = try await (hr, runSpeed, cycleSpeed)
        let speed = running ?? cycling

        let recentThreshold = Date().addingTimeInterval(-30)
        let hasActiveWorkout = (heartRate?.date ?? .distantPast) > recentThreshold
            || (speed?.date ?? .distantPast) > recentThreshold

        return Stats(heartRate: heartRate?.value, speed: speed?.value, hasActiveWorkout: hasActiveWorkout)
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
}
