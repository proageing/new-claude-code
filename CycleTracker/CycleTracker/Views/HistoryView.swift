import SwiftUI
import SwiftData

/// Ride history: a running list of past rides plus a lightweight "this week"
/// summary. Rich weekly/monthly charts and the VO2max trend arrive in later phases.
struct HistoryView: View {
    @Query(sort: \Ride.startDate, order: .reverse) private var rides: [Ride]
    @Environment(\.modelContext) private var context

    var body: some View {
        NavigationStack {
            Group {
                if rides.isEmpty {
                    ContentUnavailableView(
                        "No rides yet",
                        systemImage: "bicycle",
                        description: Text("Start a ride from the Ride tab and it'll show up here.")
                    )
                } else {
                    List {
                        Section("This week") {
                            weekSummary
                        }
                        Section("Rides") {
                            ForEach(rides) { ride in
                                RideRow(ride: ride)
                            }
                            .onDelete(perform: delete)
                        }
                    }
                }
            }
            .navigationTitle("History")
        }
    }

    // MARK: This-week summary

    private var thisWeekRides: [Ride] {
        let calendar = Calendar.current
        guard let weekStart = calendar.dateInterval(of: .weekOfYear, for: Date())?.start else {
            return []
        }
        return rides.filter { $0.startDate >= weekStart }
    }

    private var weekSummary: some View {
        let weekRides = thisWeekRides
        let totalDistance = weekRides.reduce(0) { $0 + $1.distanceMeters }
        return HStack {
            summaryItem(
                value: RideFormatters.distance(totalDistance),
                unit: "km",
                label: "Distance"
            )
            Divider()
            summaryItem(value: "\(weekRides.count)", unit: "", label: "Rides")
        }
        .frame(maxWidth: .infinity)
    }

    private func summaryItem(value: String, unit: String, label: String) -> some View {
        VStack(spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value).font(.title2.weight(.bold)).monospacedDigit()
                if !unit.isEmpty { Text(unit).font(.subheadline).foregroundStyle(.secondary) }
            }
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Delete

    private func delete(_ offsets: IndexSet) {
        for index in offsets {
            context.delete(rides[index])
        }
        try? context.save()
    }
}

/// One row in the ride list.
private struct RideRow: View {
    let ride: Ride

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(RideFormatters.dateTime(ride.startDate))
                .font(.headline)
            HStack(spacing: 16) {
                stat("bicycle", "\(RideFormatters.distance(ride.distanceMeters)) km")
                stat("clock", RideFormatters.duration(ride.movingTimeSeconds))
                stat("speedometer", "\(RideFormatters.speed(ride.averageSpeedMetersPerSecond)) km/h")
                if let maxHR = ride.maxHeartRate {
                    stat("heart.fill", "\(RideFormatters.heartRate(maxHR)) bpm")
                }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private func stat(_ symbol: String, _ text: String) -> some View {
        Label(text, systemImage: symbol)
            .labelStyle(.titleAndIcon)
            .imageScale(.small)
    }
}
