import SwiftUI

/// Top-level tab layout. Phase 1 ships the Ride and History tabs; a dedicated
/// Trends tab (VO2max, resting/max HR) is added in a later phase.
struct RootView: View {
    var body: some View {
        TabView {
            LiveRideView()
                .tabItem { Label("Ride", systemImage: "bicycle") }
            HistoryView()
                .tabItem { Label("History", systemImage: "chart.xyaxis.line") }
        }
    }
}
