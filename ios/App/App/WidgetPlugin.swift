import Capacitor
import Foundation
import WidgetKit

/// Receives the next two weeks of Panchang from the app (src/ui/widgetBridge.ts) and keeps it in
/// the App Group shared with the PanchangWidget extension, then asks the system to redraw the widget.
@objc(NityaWidgetPlugin)
public class NityaWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NityaWidgetPlugin"
    public let jsName = "NityaWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setData", returnType: CAPPluginReturnPromise),
    ]

    /// Must match the App Group turned on for both the app and the widget extension.
    static let appGroup = "group.com.anveshpasunoori.nitya"

    @objc func setData(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is required")
            return
        }
        guard let shared = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App Group \(Self.appGroup) is not enabled")
            return
        }
        shared.set(json, forKey: "json")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
