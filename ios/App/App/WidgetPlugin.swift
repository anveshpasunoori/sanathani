import Capacitor
import Foundation
import WidgetKit

/// Receives the next two weeks of Panchang from the app (src/ui/widgetBridge.ts) and keeps it in
/// the App Group shared with the PanchangWidget extension, then asks the system to redraw the widget.
@objc(SanathaniWidgetPlugin)
public class SanathaniWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SanathaniWidgetPlugin"
    public let jsName = "SanathaniWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setData", returnType: CAPPluginReturnPromise),
    ]

    /// Must match the App Group turned on for both the app and the widget extension.
    static let appGroup = "group.com.anveshpasunoori.sanathani"

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
