import Foundation
import HealthKit

@MainActor
final class HealthKitManager {
    static let shared = HealthKitManager()

    private let store = HKHealthStore()
    private let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    private let runningSpeedType = HKQuantityType.quantityType(forIdentifier: .runningSpeed)!
    private let cyclingSpeedType = HKQuantityType.quantityType(forIdentifier: .cyclingSpeed)!
    private let workoutType = HKObjectType.workoutType()

    struct Stats {
        let heartRate: Double?   // beats per minute
        let speed: Double?       // meters per second
        let hasActiveWorkout: Bool
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
        let readTypes: Set<HKObjectType> = [heartRateType, runningSpeedType, cyclingSpeedType, workoutType]
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    /// Reads the most recent heart rate and speed samples HealthKit has received
    /// from the active Apple Watch workout (the stock Workout app syncs these
    /// every few seconds, so expect a short delay rather than a truly live feed).
    func fetchLatestStats() async throws -> Stats {
        async let active = fetchActiveWorkoutExists()
        async let hr = fetchLatestQuantity(for: heartRateType, unit: HKUnit.count().unitDivided(by: .minute()))
        async let runSpeed = fetchLatestQuantity(for: runningSpeedType, unit: HKUnit.meter().unitDivided(by: .second()))
        async let cycleSpeed = fetchLatestQuantity(for: cyclingSpeedType, unit: HKUnit.meter().unitDivided(by: .second()))

        let (hasActiveWorkout, heartRate, running, cycling) = try await (active, hr, runSpeed, cycleSpeed)
        return Stats(heartRate: heartRate, speed: running ?? cycling, hasActiveWorkout: hasActiveWorkout)
    }

    private func fetchActiveWorkoutExists() async -> Bool {
        await withCheckedContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: Date().addingTimeInterval(-6 * 60 * 60), end: nil, options: .strictStartDate)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
            let query = HKSampleQuery(sampleType: workoutType, predicate: predicate, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let workout = samples?.first as? HKWorkout
                // Treat a workout as "active" if it ended in the last 15 minutes or
                // hasn't formally ended yet (endDate keeps advancing while it's live).
                let stillActive = workout.map { $0.endDate > Date().addingTimeInterval(-15 * 60) } ?? false
                continuation.resume(returning: stillActive)
            }
            store.execute(query)
        }
    }

    private func fetchLatestQuantity(for type: HKQuantityType, unit: HKUnit) async throws -> Double? {
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
                continuation.resume(returning: sample.quantity.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }
}
