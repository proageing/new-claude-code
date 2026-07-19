import Foundation
import CoreLocation

/// Thin wrapper around `CLLocationManager` configured for cycling.
///
/// Delivers location and authorization updates through closures. `CLLocationManager`
/// created on the main thread delivers its delegate callbacks on the main thread, so
/// we bridge into the main actor with `assumeIsolated` to keep sample ordering
/// deterministic (no async reordering of GPS points).
final class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    /// Called for each new location fix while updates are running.
    var locationHandler: ((CLLocation) -> Void)?
    /// Called whenever the authorization status changes.
    var authorizationHandler: ((CLAuthorizationStatus) -> Void)?

    private(set) var authorizationStatus: CLAuthorizationStatus

    override init() {
        authorizationStatus = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.distanceFilter = kCLDistanceFilterNone
        manager.activityType = .fitness
        // We manage pause/resume ourselves; don't let the system silently pause us.
        manager.pausesLocationUpdatesAutomatically = false
    }

    func requestAuthorization() {
        manager.requestWhenInUseAuthorization()
    }

    /// Starts location updates. When `background` is true and we're authorized,
    /// enables background delivery so tracking survives a locked screen /
    /// pocketed phone. Requires the `location` background mode in Info.plist.
    func startUpdates(background: Bool) {
        let authorized = authorizationStatus == .authorizedAlways
            || authorizationStatus == .authorizedWhenInUse
        if background && authorized {
            manager.allowsBackgroundLocationUpdates = true
        }
        manager.startUpdatingLocation()
    }

    func stopUpdates() {
        manager.allowsBackgroundLocationUpdates = false
        manager.stopUpdatingLocation()
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        MainActor.assumeIsolated {
            for location in locations {
                locationHandler?(location)
            }
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        MainActor.assumeIsolated {
            authorizationStatus = status
            authorizationHandler?(status)
        }
    }
}
