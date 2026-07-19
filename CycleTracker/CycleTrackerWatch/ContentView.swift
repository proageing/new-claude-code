import SwiftUI

/// The watch face for a ride: a big live heart-rate readout and a Start/Stop
/// button, so heart rate can be driven from the wrist even if the phone doesn't
/// manage to launch the workout.
struct ContentView: View {
    @Environment(WorkoutManager.self) private var workout

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "heart.fill")
                .foregroundStyle(.pink)
                .font(.title3)
                .symbolEffect(.pulse, isActive: workout.isWorkoutRunning)

            Text(heartRateText)
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            Text("bpm")
                .font(.caption)
                .foregroundStyle(.secondary)

            Button(action: toggle) {
                Text(workout.isWorkoutRunning ? "Stop" : "Start")
                    .frame(maxWidth: .infinity)
            }
            .tint(workout.isWorkoutRunning ? .red : .green)
        }
        .padding()
    }

    private var heartRateText: String {
        workout.currentHeartRate > 0 ? "\(Int(workout.currentHeartRate))" : "—"
    }

    private func toggle() {
        if workout.isWorkoutRunning {
            workout.stopWorkout()
        } else {
            Task {
                await workout.requestAuthorization()
                workout.startWorkout()
            }
        }
    }
}
