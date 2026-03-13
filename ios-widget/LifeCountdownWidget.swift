import WidgetKit
import SwiftUI

// MARK: - Data Model
struct WidgetData: Codable {
    let birthDate: String
    let lifeExpectancy: Int
    let daysLeft: Int
    let weeksLeft: Int
    let yearsLeft: Int
    let percentLived: Double
    let lastUpdated: String
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    let appGroup = "group.com.m888ai.lifecountdown"
    
    func placeholder(in context: Context) -> LifeEntry {
        LifeEntry(date: Date(), daysLeft: 16425, weeksLeft: 2346, yearsLeft: 45, percentLived: 43.75)
    }

    func getSnapshot(in context: Context, completion: @escaping (LifeEntry) -> ()) {
        let entry = loadEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LifeEntry>) -> ()) {
        let entry = loadEntry()
        
        // Update at midnight
        let nextMidnight = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
        let timeline = Timeline(entries: [entry], policy: .after(nextMidnight))
        completion(timeline)
    }
    
    private func loadEntry() -> LifeEntry {
        guard let sharedDefaults = UserDefaults(suiteName: appGroup),
              let jsonString = sharedDefaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8),
              let data = try? JSONDecoder().decode(WidgetData.self, from: jsonData) else {
            return LifeEntry(date: Date(), daysLeft: 0, weeksLeft: 0, yearsLeft: 0, percentLived: 0)
        }
        
        return LifeEntry(
            date: Date(),
            daysLeft: data.daysLeft,
            weeksLeft: data.weeksLeft,
            yearsLeft: data.yearsLeft,
            percentLived: data.percentLived
        )
    }
}

// MARK: - Timeline Entry
struct LifeEntry: TimelineEntry {
    let date: Date
    let daysLeft: Int
    let weeksLeft: Int
    let yearsLeft: Int
    let percentLived: Double
}

// MARK: - Small Widget View
struct SmallWidgetView: View {
    var entry: LifeEntry
    
    var body: some View {
        ZStack {
            Color.black
            VStack(spacing: 4) {
                Text("💀")
                    .font(.title2)
                Text("\(entry.daysLeft)")
                    .font(.system(size: 36, weight: .light, design: .default))
                    .foregroundColor(.white)
                Text("days left")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Medium Widget View
struct MediumWidgetView: View {
    var entry: LifeEntry
    
    var body: some View {
        ZStack {
            Color.black
            HStack(spacing: 20) {
                VStack(spacing: 4) {
                    Text("💀")
                        .font(.title2)
                    Text("\(entry.daysLeft)")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(.white)
                    Text("days")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
                
                Divider()
                    .background(Color.gray.opacity(0.3))
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("\(entry.weeksLeft)")
                            .font(.system(size: 20, weight: .light))
                            .foregroundColor(.white)
                        Text("weeks")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    HStack {
                        Text("\(entry.yearsLeft)")
                            .font(.system(size: 20, weight: .light))
                            .foregroundColor(.white)
                        Text("years")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 4)
                                .cornerRadius(2)
                            Rectangle()
                                .fill(Color.orange)
                                .frame(width: geo.size.width * CGFloat(entry.percentLived / 100), height: 4)
                                .cornerRadius(2)
                        }
                    }
                    .frame(height: 4)
                    
                    Text("\(String(format: "%.1f", entry.percentLived))% lived")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding()
        }
    }
}

// MARK: - Large Widget View
struct LargeWidgetView: View {
    var entry: LifeEntry
    
    var body: some View {
        ZStack {
            Color.black
            VStack(spacing: 16) {
                // Header
                HStack {
                    Text("💀")
                        .font(.title)
                    Text("Memento Mori")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }
                
                // Big number
                VStack(spacing: 2) {
                    Text("\(entry.daysLeft)")
                        .font(.system(size: 64, weight: .ultraLight))
                        .foregroundColor(.white)
                    Text("days remaining")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                
                // Progress bar
                VStack(spacing: 4) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 8)
                                .cornerRadius(4)
                            Rectangle()
                                .fill(Color.orange)
                                .frame(width: geo.size.width * CGFloat(entry.percentLived / 100), height: 8)
                                .cornerRadius(4)
                        }
                    }
                    .frame(height: 8)
                    
                    Text("\(String(format: "%.2f", entry.percentLived))% complete")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                // Stats grid
                HStack(spacing: 20) {
                    VStack {
                        Text("\(entry.yearsLeft)")
                            .font(.system(size: 28, weight: .light))
                            .foregroundColor(.white)
                        Text("years")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    VStack {
                        Text("\(entry.weeksLeft)")
                            .font(.system(size: 28, weight: .light))
                            .foregroundColor(.white)
                        Text("weeks")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    VStack {
                        Text("\(entry.daysLeft)")
                            .font(.system(size: 28, weight: .light))
                            .foregroundColor(.white)
                        Text("days")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                Text("Make today count.")
                    .font(.caption)
                    .foregroundColor(.orange)
                    .italic()
            }
            .padding()
        }
    }
}

// MARK: - Widget Configuration
@main
struct LifeCountdownWidget: Widget {
    let kind: String = "LifeCountdownWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            LifeCountdownWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Life Countdown")
        .description("See how many days you have left.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct LifeCountdownWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Previews
struct LifeCountdownWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            SmallWidgetView(entry: LifeEntry(date: Date(), daysLeft: 16425, weeksLeft: 2346, yearsLeft: 45, percentLived: 43.75))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
            
            MediumWidgetView(entry: LifeEntry(date: Date(), daysLeft: 16425, weeksLeft: 2346, yearsLeft: 45, percentLived: 43.75))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
            
            LargeWidgetView(entry: LifeEntry(date: Date(), daysLeft: 16425, weeksLeft: 2346, yearsLeft: 45, percentLived: 43.75))
                .previewContext(WidgetPreviewContext(family: .systemLarge))
        }
    }
}
