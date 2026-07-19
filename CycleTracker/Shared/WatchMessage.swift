import Foundation

/// Message contract shared between the iPhone app and the Watch companion,
/// exchanged over WatchConnectivity. This file is compiled into both targets, so
/// the phone and watch always agree on the wire format.
enum WatchMessage {
    static let commandKey = "command"
    static let heartRateKey = "heartRate"
    static let timestampKey = "timestamp"

    /// Ride lifecycle commands the phone sends to the watch.
    enum Command: String {
        case startRide
        case stopRide
    }

    static func command(_ command: Command) -> [String: Any] {
        [commandKey: command.rawValue]
    }

    static func heartRate(_ bpm: Double, at date: Date = Date()) -> [String: Any] {
        [heartRateKey: bpm, timestampKey: date.timeIntervalSince1970]
    }
}
