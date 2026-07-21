import SwiftUI
import AVFoundation

struct ContentView: View {
    @State private var heartRateText = "--"
    @State private var speedText = "--"
    @State private var distanceText = "--"
    @State private var statusMessage = "Waiting for workout data…"
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
                Label("\(distanceText) mi", systemImage: "map")
                    .font(.largeTitle)
            }

            Text(statusMessage)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Speak Now", action: speakNow)
                .buttonStyle(.borderedProminent)

            Text("Tip: once installed, just say “Hey Siri, get my stats” with your AirPods in — no need to open this app.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .task {
            try? await HealthKitManager.shared.requestAuthorization()
            await refreshLoop()
        }
    }

    /// Keeps the on-screen numbers current while the app is open, polling
    /// every few seconds since HealthKit only has whatever the Watch has
    /// synced so far — a single fetch can't be any fresher than that.
    private func refreshLoop() async {
        while !Task.isCancelled {
            await refresh()
            try? await Task.sleep(nanoseconds: 3_000_000_000)
        }
    }

    private func refresh() async {
        do {
            let stats = try await HealthKitManager.shared.fetchLatestStats()
            heartRateText = stats.heartRate.map { String(Int($0.rounded())) } ?? "--"
            speedText = stats.speed.map { String(format: "%.1f", $0 * 2.23694) } ?? "--"
            distanceText = stats.distance.map { String(format: "%.2f", $0 * 0.000621371) } ?? "--"
            statusMessage = stats.hasActiveWorkout ? "Workout detected — updating live." : "No active workout detected on your Apple Watch."
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func speakNow() {
        Task {
            await refresh()
            speak(heartRateText: heartRateText, speedText: speedText, distanceText: distanceText)
        }
    }

    private func speak(heartRateText: String, speedText: String, distanceText: String) {
        var phrase = ""
        if heartRateText != "--" {
            phrase += "Heart rate: \(heartRateText) beats per minute. "
        }
        if speedText != "--" {
            phrase += "Speed: \(speedText) miles per hour. "
        }
        if distanceText != "--" {
            phrase += "Distance: \(distanceText) miles."
        }
        if phrase.isEmpty {
            phrase = "No recent heart rate, speed, or distance data found."
        }
        let utterance = AVSpeechUtterance(string: phrase)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        synthesizer.speak(utterance)
    }
}

#Preview {
    ContentView()
}
