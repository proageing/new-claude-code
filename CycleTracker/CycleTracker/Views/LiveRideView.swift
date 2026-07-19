import SwiftUI
import CoreLocation

/// The live ride screen: glanceable metrics plus start/pause/resume/finish controls.
struct LiveRideView: View {
    @Environment(RideSessionManager.self) private var session

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if isPermissionDenied {
                    permissionBanner
                }
                metrics
                Spacer(minLength: 0)
                controls
            }
            .padding()
            .navigationTitle("Ride")
            .onAppear { session.requestAuthorization() }
        }
    }

    // MARK: Metrics

    private var metrics: some View {
        VStack(spacing: 16) {
            MetricTile(
                title: "Speed",
                value: RideFormatters.speed(session.currentSpeedMetersPerSecond),
                unit: "km/h",
                systemImage: "speedometer"
            )
            HStack(spacing: 16) {
                MetricTile(
                    title: "Distance",
                    value: RideFormatters.distance(session.distanceMeters),
                    unit: "km",
                    systemImage: "arrow.triangle.swap"
                )
                MetricTile(
                    title: "Time",
                    value: RideFormatters.duration(session.elapsedSeconds),
                    unit: "",
                    systemImage: "clock"
                )
            }
            MetricTile(
                title: "Heart Rate",
                value: RideFormatters.heartRate(session.currentHeartRate),
                unit: "bpm",
                systemImage: "heart.fill",
                tint: session.currentHeartRate == nil ? .primary : .pink
            )
        }
    }

    // MARK: Controls

    @ViewBuilder
    private var controls: some View {
        switch session.state {
        case .idle:
            primaryButton("Start Ride", color: .green) { session.start() }
        case .recording:
            HStack(spacing: 16) {
                secondaryButton("Pause", color: .orange) { session.pause() }
                secondaryButton("Finish", color: .red) { session.stop() }
            }
        case .paused:
            HStack(spacing: 16) {
                secondaryButton("Resume", color: .green) { session.resume() }
                secondaryButton("Finish", color: .red) { session.stop() }
            }
        }
    }

    private func primaryButton(_ title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.title3.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        }
        .buttonStyle(.borderedProminent)
        .tint(color)
        .controlSize(.large)
    }

    private func secondaryButton(_ title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.title3.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        }
        .buttonStyle(.bordered)
        .tint(color)
        .controlSize(.large)
    }

    // MARK: Permission

    private var isPermissionDenied: Bool {
        session.authorizationStatus == .denied || session.authorizationStatus == .restricted
    }

    private var permissionBanner: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("Location access needed", systemImage: "location.slash")
                .font(.headline)
            Text("Enable location in Settings to record speed and distance.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(RoundedRectangle(cornerRadius: 12).fill(.red.opacity(0.15)))
    }
}
