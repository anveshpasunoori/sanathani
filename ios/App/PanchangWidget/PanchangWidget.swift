import SwiftUI
import WidgetKit

// Home-screen widget: today's thithi and nakshatra (the ones prevailing now), Rahu Kalam, sunrise
// and sunset, and the day's festival or family event. The app hands over two weeks of ready-made
// data in the reader's language (src/data/widget.ts → NityaWidgetPlugin → App Group), so the
// widget needs no network and no calculation. The timeline switches exactly when a thithi or
// nakshatra ends and at midnight.

private let appGroup = "group.com.anveshpasunoori.nitya"

struct WidgetSpan: Decodable { let name: String; let ends: Date }
struct WidgetRahu: Decodable { let text: String; let start: Date; let end: Date }
struct WidgetDay: Decodable {
    let date: String
    let heading: String
    let month: String
    let tithis: [WidgetSpan]
    let nakshatras: [WidgetSpan]
    let sunrise: String
    let sunset: String
    let rahu: WidgetRahu
    let festivals: [String]
    let family: [String]
}
struct WidgetLabels: Decodable { let thithi, nakshatra, rahu, sunrise, sunset, now, openApp: String }
struct WidgetData: Decodable {
    let place: String
    let labels: WidgetLabels
    let nextFamily: String?
    let days: [WidgetDay]
}

private func loadData() -> WidgetData? {
    guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "json"), let bytes = json.data(using: .utf8) else { return nil }
    let decoder = JSONDecoder()
    // The app writes JavaScript ISO strings with milliseconds ("2026-11-01T12:34:56.789Z").
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    decoder.dateDecodingStrategy = .custom { d in
        let s = try d.singleValueContainer().decode(String.self)
        guard let date = iso.date(from: s) else { throw DecodingError.dataCorrupted(.init(codingPath: d.codingPath, debugDescription: s)) }
        return date
    }
    return try? decoder.decode(WidgetData.self, from: bytes)
}

private func civilDate(_ date: Date) -> String {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: date)
}

struct PanchangEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?

    var day: WidgetDay? { data?.days.first { $0.date == civilDate(date) } }
    /// The span prevailing at this entry's time: the first that hasn't ended.
    func current(_ spans: [WidgetSpan]) -> String { (spans.first { $0.ends > date } ?? spans.last)?.name ?? "" }
}

struct PanchangProvider: TimelineProvider {
    func placeholder(in context: Context) -> PanchangEntry { PanchangEntry(date: Date(), data: loadData()) }

    func getSnapshot(in context: Context, completion: @escaping (PanchangEntry) -> Void) {
        completion(PanchangEntry(date: Date(), data: loadData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PanchangEntry>) -> Void) {
        let data = loadData()
        let now = Date()
        let horizon = now.addingTimeInterval(36 * 3600)
        // Redraw at every thithi/nakshatra change, at Rahu Kalam's start and end, and at midnight.
        var moments: Set<Date> = [now]
        for day in data?.days ?? [] {
            for t in day.tithis + day.nakshatras where t.ends > now && t.ends < horizon { moments.insert(t.ends) }
            for t in [day.rahu.start, day.rahu.end] where t > now && t < horizon { moments.insert(t) }
        }
        var midnight = Calendar.current.startOfDay(for: now)
        for _ in 0..<2 {
            midnight = Calendar.current.date(byAdding: .day, value: 1, to: midnight)!
            moments.insert(midnight)
        }
        let entries = moments.sorted().map { PanchangEntry(date: $0, data: data) }
        completion(Timeline(entries: entries, policy: .after(horizon)))
    }
}

private let maroon = Color(red: 0.48, green: 0.12, blue: 0.17)
private let ink = Color(red: 0.17, green: 0.13, blue: 0.11)
private let muted = Color(red: 0.42, green: 0.35, blue: 0.31)
private let cream = Color(red: 0.99, green: 0.97, blue: 0.93)

struct PanchangWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: PanchangEntry

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetBackground(cream)
    }

    @ViewBuilder var content: some View {
        if let data = entry.data, let day = entry.day {
            VStack(alignment: .leading, spacing: 3) {
                Text(day.heading).font(.headline).foregroundColor(maroon).lineLimit(1)
                Text(day.month).font(.caption2).foregroundColor(muted).lineLimit(1)
                Spacer(minLength: 2)
                Text("\(data.labels.thithi): \(entry.current(day.tithis))").font(.subheadline).foregroundColor(ink).lineLimit(2)
                Text("\(data.labels.nakshatra): \(entry.current(day.nakshatras))").font(.subheadline).foregroundColor(ink).lineLimit(1)
                if family != .systemSmall {
                    let rahuNow = entry.date >= day.rahu.start && entry.date < day.rahu.end
                    Text("⚠ \(data.labels.rahu): \(day.rahu.text)\(rahuNow ? " · \(data.labels.now)" : "")")
                        .font(.caption).foregroundColor(Color(red: 0.6, green: 0.2, blue: 0.07)).lineLimit(1)
                    Text("🌅 \(day.sunrise)   🌇 \(day.sunset)").font(.caption).foregroundColor(muted).lineLimit(1)
                    if let note = day.festivals.first.map({ "🪔 \($0)" }) ?? day.family.first.map({ "🙏 \($0)" }) ?? data.nextFamily.map({ "🗓 \($0)" }) {
                        Text(note).font(.caption).foregroundColor(maroon).lineLimit(1)
                    }
                } else if let festival = day.festivals.first {
                    Text("🪔 \(festival)").font(.caption2).foregroundColor(maroon).lineLimit(1)
                }
            }
        } else {
            // No data yet (the app hasn't been opened since install), or two weeks without opening it.
            VStack(alignment: .leading, spacing: 4) {
                Text("Nitya").font(.headline).foregroundColor(maroon)
                Text("Open Nitya once to show today's Panchang").font(.caption).foregroundColor(muted)
            }
        }
    }
}

private extension View {
    /// iOS 17 draws widget backgrounds through containerBackground; earlier versions take a plain background.
    @ViewBuilder func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            padding().background(color)
        }
    }
}

@main
struct PanchangWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PanchangWidget", provider: PanchangProvider()) { entry in
            PanchangWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Panchang")
        .description("Thithi, nakshatra and Rahu Kalam for today.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
