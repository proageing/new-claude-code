import Foundation
import WatchConnectivity
import HealthKit

/// iPhone side of the Watch link.
///
/// Responsibilities:
/// - Activate the `WCSession` and relay ride start/stop commands to the watch.
/// - Surface incoming heart-rate readings via `heartRateHandler`.
/// - Best-effort launch of the watch app when a ride starts, via
///   `HKHealthStore.startWatchApp(with:)`, so heart rate can begin without the
///   rider having to open the watch app by hand.
///
/// `WCSession` delegate callbacks arrive on a background queue, so anything that
/// touches main-actor UI state is hopped onto the main queue.
final class WatchConnectivityManager: NSObject, WCSessionDelegate {
    /// Invoked on the main queue with each heart-rate reading from the watch.
    var heartRateHandler: ((Double) -> Void)?

    private let session: WCSession?
    private let healthStore = HKHealthStore()

    override init() {
        session = WCSession.isSupported() ? WCSession.default : nil
        super.init()
        session?.delegate = self
        session?.activate()
        requestHealthAuthorizationIfNeeded()
    }

    var isWatchReachable: Bool { session?.isReachable ?? false }

    // MARK: Ride control

    func startRide() {
        launchWatchWorkout()
        send(WatchMessage.command(.startRide))
    }

    func stopRide() {
        send(WatchMessage.command(.stopRide))
    }

    // MARK: HealthKit / watch launch

    /// Requests permission to save workouts, which `startWatchApp(with:)` needs.
    private func requestHealthAuthorizationIfNeeded() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        healthStore.requestAuthorization(
            toShare: [HKQuantityType.workoutType()],
            read: []
        ) { _, _ in }
    }

    /// Best-effort: launches the watch app so its workout session (and heart-rate
    /// stream) can start. No-op if HealthKit is unavailable or permission is denied.
    private func launchWatchWorkout() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .cycling
        configuration.locationType = .outdoor
        healthStore.startWatchApp(with: configuration) { _, _ in }
    }

    // MARK: Messaging

    private func send(_ message: [String: Any]) {
        guard let session, session.activationState == .activated else { return }
        if session.isReachable {
            session.sendMessage(message, replyHandler: nil) { [weak self] _ in
                // If the live message fails, fall back to a queued transfer.
                self?.session?.transferUserInfo(message)
            }
        } else {
            session.transferUserInfo(message)
        }
    }

    private func handle(_ payload: [String: Any]) {
        guard let bpm = payload[WatchMessage.heartRateKey] as? Double else { return }
        DispatchQueue.main.async { [weak self] in
            self?.heartRateHandler?(bpm)
        }
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handle(message)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handle(userInfo)
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // Re-activate so the session survives switching paired watches.
        session.activate()
    }
}
