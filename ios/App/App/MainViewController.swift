import Capacitor
import UIKit

/// The app's web view controller. Registers plugins that live in this app rather than in npm
/// packages — the home-screen widget's data bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SanathaniWidgetPlugin())
    }
}
