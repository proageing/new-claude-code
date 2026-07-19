import SwiftUI
import SwiftData

@main
struct CycleTrackerApp: App {
    let container: ModelContainer
    @State private var session: RideSessionManager

    init() {
        do {
            container = try ModelContainer(for: Ride.self, RideSample.self)
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
        let manager = RideSessionManager()
        manager.configure(context: container.mainContext)
        _session = State(initialValue: manager)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
        }
        .modelContainer(container)
    }
}
