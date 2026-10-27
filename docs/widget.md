# Home-screen widget — finishing setup

The widget shows today's thithi and nakshatra (switching at the exact moment they change), Rahu Kalam,
sunrise/sunset, and the day's festival or family event, in the reader's language. The app prepares two
weeks of data (`src/data/widget.ts`) and hands it to the phone (`src/ui/widgetBridge.ts`), so the widget
works offline and stays right for two weeks even if the app isn't opened.

Already in the projects:
- Android: `PanchangWidget.java`, `WidgetPlugin.java`, `MainActivity.java` (registers the plugin),
  `res/layout/widget_panchang.xml`, `res/xml/panchang_widget_info.xml`, the `<receiver>` in the manifest.
- iOS app target: `WidgetPlugin.swift`, `MainViewController.swift` (registers the plugin; Main.storyboard uses it).
- iOS widget code: `ios/App/PanchangWidget/PanchangWidget.swift` (needs its own target, below).

## Android (needs Android Studio)
1. Install Android Studio, open the `android` folder, let Gradle sync.
2. `npm run build && npx cap sync android`, then Run on a phone or emulator.
3. Open the app once, then long-press the home screen → Widgets → Sanathani → "Today's thithi…".

## iOS (needs Xcode — App Store)
1. `sudo xcode-select -s /Applications/Xcode.app` (once, after installing Xcode).
2. `npm run build && npx cap sync ios`, then open `ios/App/App.xcodeproj`.
3. File → New → Target → **Widget Extension**. Product name **PanchangWidget**; untick "Include
   Live Activity" and "Include Configuration App Intent". Deployment target iOS 15 or later.
4. Delete the Swift files Xcode generated in the new PanchangWidget group and add
   `ios/App/PanchangWidget/PanchangWidget.swift` to the **PanchangWidget** target.
5. Signing & Capabilities → **+ Capability → App Groups** on **both** the App and PanchangWidget targets,
   with the group `group.com.anveshpasunoori.sanathani` (it must match `WidgetPlugin.swift`).
6. Run the app once, then add the widget from the home screen (long-press → + → Sanathani).
