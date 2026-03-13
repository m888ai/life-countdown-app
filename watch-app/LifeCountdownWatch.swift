import SwiftUI
import ClockKit
import WatchConnectivity

// MARK: - Watch App
@main
struct LifeCountdownWatchApp: App {
    @StateObject private var dataManager = WatchDataManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(dataManager)
        }
    }
}

// MARK: - Data Manager
class WatchDataManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchDataManager()
    
    @Published var daysLeft: Int = 0
    @Published var weeksLeft: Int = 0
    @Published var yearsLeft: Int = 0
    @Published var percentLived: Double = 0
    @Published var isConnected: Bool = false
    
    private var session: WCSession?
    
    override init() {
        super.init()
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
        loadFromUserDefaults()
    }
    
    func loadFromUserDefaults() {
        let defaults = UserDefaults.standard
        daysLeft = defaults.integer(forKey: "daysLeft")
        weeksLeft = defaults.integer(forKey: "weeksLeft")
        yearsLeft = defaults.integer(forKey: "yearsLeft")
        percentLived = defaults.double(forKey: "percentLived")
    }
    
    func saveToUserDefaults() {
        let defaults = UserDefaults.standard
        defaults.set(daysLeft, forKey: "daysLeft")
        defaults.set(weeksLeft, forKey: "weeksLeft")
        defaults.set(yearsLeft, forKey: "yearsLeft")
        defaults.set(percentLived, forKey: "percentLived")
        
        // Update complications
        let server = CLKComplicationServer.sharedInstance()
        for complication in server.activeComplications ?? [] {
            server.reloadTimeline(for: complication)
        }
    }
    
    // WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isConnected = activationState == .activated
        }
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        DispatchQueue.main.async {
            if let daysLeft = applicationContext["daysLeft"] as? Int {
                self.daysLeft = daysLeft
            }
            if let weeksLeft = applicationContext["weeksLeft"] as? Int {
                self.weeksLeft = weeksLeft
            }
            if let yearsLeft = applicationContext["yearsLeft"] as? Int {
                self.yearsLeft = yearsLeft
            }
            if let percentLived = applicationContext["percentLived"] as? Double {
                self.percentLived = percentLived
            }
            self.saveToUserDefaults()
        }
    }
}

// MARK: - Watch Content View
struct ContentView: View {
    @EnvironmentObject var dataManager: WatchDataManager
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Skull header
                Text("💀")
                    .font(.largeTitle)
                
                // Days left - big number
                VStack(spacing: 2) {
                    Text("\(dataManager.daysLeft)")
                        .font(.system(size: 44, weight: .ultraLight))
                        .foregroundColor(.white)
                    Text("days left")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
                
                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.3), lineWidth: 6)
                    Circle()
                        .trim(from: 0, to: CGFloat(dataManager.percentLived / 100))
                        .stroke(Color.orange, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    
                    VStack {
                        Text("\(String(format: "%.1f", dataManager.percentLived))%")
                            .font(.caption)
                            .foregroundColor(.white)
                        Text("lived")
                            .font(.system(size: 8))
                            .foregroundColor(.gray)
                    }
                }
                .frame(width: 60, height: 60)
                
                // Quick stats
                HStack(spacing: 20) {
                    VStack {
                        Text("\(dataManager.yearsLeft)")
                            .font(.title3)
                            .foregroundColor(.white)
                        Text("years")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                    VStack {
                        Text("\(dataManager.weeksLeft)")
                            .font(.title3)
                            .foregroundColor(.white)
                        Text("weeks")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
        }
    }
}

// MARK: - Complication Provider
class ComplicationController: NSObject, CLKComplicationDataSource {
    
    func getCurrentTimelineEntry(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void) {
        let dataManager = WatchDataManager.shared
        let entry = createTimelineEntry(for: complication, date: Date(), daysLeft: dataManager.daysLeft, percentLived: dataManager.percentLived)
        handler(entry)
    }
    
    func getComplicationDescriptors(handler: @escaping ([CLKComplicationDescriptor]) -> Void) {
        let descriptors = [
            CLKComplicationDescriptor(
                identifier: "lifecountdown",
                displayName: "Life Countdown",
                supportedFamilies: [
                    .circularSmall,
                    .modularSmall,
                    .modularLarge,
                    .utilitarianSmall,
                    .utilitarianLarge,
                    .graphicCorner,
                    .graphicCircular,
                    .graphicRectangular
                ]
            )
        ]
        handler(descriptors)
    }
    
    private func createTimelineEntry(for complication: CLKComplication, date: Date, daysLeft: Int, percentLived: Double) -> CLKComplicationTimelineEntry? {
        var template: CLKComplicationTemplate?
        
        switch complication.family {
        case .circularSmall:
            let t = CLKComplicationTemplateCircularSmallStackText()
            t.line1TextProvider = CLKSimpleTextProvider(text: "💀")
            t.line2TextProvider = CLKSimpleTextProvider(text: "\(daysLeft)")
            template = t
            
        case .modularSmall:
            let t = CLKComplicationTemplateModularSmallStackText()
            t.line1TextProvider = CLKSimpleTextProvider(text: "💀")
            t.line2TextProvider = CLKSimpleTextProvider(text: "\(daysLeft)d")
            template = t
            
        case .modularLarge:
            let t = CLKComplicationTemplateModularLargeStandardBody()
            t.headerTextProvider = CLKSimpleTextProvider(text: "💀 Memento Mori")
            t.body1TextProvider = CLKSimpleTextProvider(text: "\(daysLeft) days left")
            t.body2TextProvider = CLKSimpleTextProvider(text: "\(String(format: "%.1f", percentLived))% complete")
            template = t
            
        case .utilitarianSmall:
            let t = CLKComplicationTemplateUtilitarianSmallFlat()
            t.textProvider = CLKSimpleTextProvider(text: "💀 \(daysLeft)d")
            template = t
            
        case .utilitarianLarge:
            let t = CLKComplicationTemplateUtilitarianLargeFlat()
            t.textProvider = CLKSimpleTextProvider(text: "💀 \(daysLeft) days left")
            template = t
            
        case .graphicCorner:
            let t = CLKComplicationTemplateGraphicCornerStackText()
            t.innerTextProvider = CLKSimpleTextProvider(text: "\(daysLeft)")
            t.outerTextProvider = CLKSimpleTextProvider(text: "days")
            template = t
            
        case .graphicCircular:
            let t = CLKComplicationTemplateGraphicCircularStackText()
            t.line1TextProvider = CLKSimpleTextProvider(text: "💀")
            t.line2TextProvider = CLKSimpleTextProvider(text: "\(daysLeft)")
            template = t
            
        case .graphicRectangular:
            let t = CLKComplicationTemplateGraphicRectangularStandardBody()
            t.headerTextProvider = CLKSimpleTextProvider(text: "💀 Life Countdown")
            t.body1TextProvider = CLKSimpleTextProvider(text: "\(daysLeft) days remaining")
            t.body2TextProvider = CLKSimpleTextProvider(text: "\(String(format: "%.1f", percentLived))% lived")
            template = t
            
        default:
            break
        }
        
        if let template = template {
            return CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        }
        return nil
    }
    
    func getTimelineEndDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
        handler(nil)
    }
    
    func getPrivacyBehavior(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void) {
        handler(.showOnLockScreen)
    }
}
