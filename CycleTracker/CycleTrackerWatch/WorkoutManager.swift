import Foundation
import HealthKit
import WatchConnectivity
import Observation

/// Watch side of the ride: runs an `HKWorkoutSession` (which keeps the app alive
/// and heart rate flowing while backgrounded) and streams each heart-rate reading
/// to the iPhone over WatchConnectivity.
///
/// Started either by a `startRide` command from the phone or by the on-watch
/// Start button. HealthKit and WatchConnectivity delegate callbacks arrive off the
/// main actor, so each hops back with `Task { @MainActor in ... }`.
@MainActor
@Observable
final class WorkoutManager: NSObject {
    private(set) var currentHeartRate: Double = 0
    private(set) var isWorkoutRunning = false

    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var wcSession: WCSession?

    override init() {
        super.init()
        if WCSession.isSupported() {
            let wcSession = WCSession.default
            wcSession.delegate = self
            wcSession.activate()
            self.wcSession = wcSession
        }
    }

    // MARK: Authorization

    func requestAuthorization() async {
        let toRead: Set<HKObjectType> = [
            HKQuantityType(.heartRate),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.distanceCycling)
        ]
        let toShare: Set<HKSampleType> = [HKQuantityType.workoutType()]
        try? await healthStore.requestAuthorization(toShare: toShare, read: toRead)
    }

    // MARK: Workout lifecycle

    func startWorkout() {
        guard !isWorkoutRunning else { return }
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .cycling
        configuration.locationType = .outdoor

        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )
            session.delegate = self
            builder.delegate = self

            self.session = session
            self.builder = builder

            let start = Date()
            session.startActivity(with: start)
            builder.beginCollection(withStart: start) { _, _ in }
            isWorkoutRunning = true
        } catch {
            isWorkoutRunning = false
        }
    }

    func stopWorkout() {
        guard isWorkoutRunning else { return }
        session?.end()
        builder?.endCollection(withEnd: Date()) { [weak self] _, _ in
            self?.builder?.finishWorkout { _, _ in }
        }
        session = nil
        builder = nil
        isWorkoutRunning = false
        currentHeartRate = 0
    }

    // MARK: Streaming

    private func sendHeartRate(_ bpm: Double) {
        guard let wcSession, wcSession.activationState == .activated, wcSession.isReachable else {
            // If the phone isn't reachable we drop the sample — stale HR is worse
            // than a momentary gap on the phone's live tile.
            return
        }
        wcSession.sendMessage(WatchMessage.heartRate(bpm), replyHandler: nil, errorHandler: nil)
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        let heartRateType = HKQuantityType(.heartRate)
        guard collectedTypes.contains(heartRateType),
              let statistics = workoutBuilder.statistics(for: heartRateType),
              let quantity = statistics.mostRecentQuantity() else { return }

        let bpm = quantity.doubleValue(for: .count().unitDivided(by: .minute()))
        Task { @MainActor in
            self.currentHeartRate = bpm
            self.sendHeartRate(bpm)
        }
    }

    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {}

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        Task { @MainActor in self.isWorkoutRunning = false }
    }
}

// MARK: - WCSessionDelegate

extension WorkoutManager: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleCommand(message)
    }

    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handleCommand(userInfo)
    }

    private nonisolated func handleCommand(_ payload: [String: Any]) {
        guard let raw = payload[WatchMessage.commandKey] as? String,
              let command = WatchMessage.Command(rawValue: raw) else { return }
        Task { @MainActor in
            switch command {
            case .startRide:
                await self.requestAuthorization()
                self.startWorkout()
            case .stopRide:
                self.stopWorkout()
            }
        }
    }
}
