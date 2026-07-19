import SwiftUI

@main
struct CycleTrackerWatchApp: App {
    @State private var workout = WorkoutManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(workout)
        }
    }
}
