import SwiftUI
import AVFoundation

struct ContentView: View {
    @State private var heartRateText = "--"
    @State private var speedText = "--"
    @State private var statusMessage = "Tap the button below to check your workout and hear it read aloud."
    private let synthesizer = AVSpeechSynthesizer()

    var body: some View {
        VStack(spacing: 24) {
            Text("Workout Voice Stats")
                .font(.title2).bold()

            VStack(spacing: 8) {
                Label("\(heartRateText) bpm", systemImage: "heart.fill")
                    .font(.largeTitle)
                Label("\(speedText) mph", systemImage: "speedometer")
                    .font(.largeTitle)
            }

            Text(statusMessage)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Refresh & Speak", action: refreshAndSpeak)
                .buttonStyle(.borderedProminent)

            Text("Tip: once installed, just say “Hey Siri, get my stats” with your AirPods in — no need to open this app.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .task {
            try? await HealthKitManager.shared.requestAuthorization()
        }
    }

    private func refreshAndSpeak() {
        Task {
            do {
                let stats = try await HealthKitManager.shared.fetchLatestStats()
                heartRateText = stats.heartRate.map { String(Int($0.rounded())) } ?? "--"
                speedText = stats.speed.map { String(format: "%.1f", $0 * 2.23694) } ?? "--"
                statusMessage = stats.hasActiveWorkout ? "Workout detected." : "No active workout detected on your Apple Watch."
                speak(heartRate: stats.heartRate, speedMetersPerSecond: stats.speed)
            } catch {
                statusMessage = error.localizedDescription
            }
        }
    }

    private func speak(heartRate: Double?, speedMetersPerSecond: Double?) {
        var phrase = ""
        if let heartRate {
            phrase += "Heart rate: \(Int(heartRate.rounded())) beats per minute. "
        }
        if let speedMetersPerSecond {
            phrase += "Speed: \(String(format: "%.1f", speedMetersPerSecond * 2.23694)) miles per hour."
        }
        if phrase.isEmpty {
            phrase = "No recent heart rate or speed data found."
        }
        let utterance = AVSpeechUtterance(string: phrase)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        synthesizer.speak(utterance)
    }
}

#Preview {
    ContentView()
}
