package com.anveshpasunoori.sanathani;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Receives the next two weeks of Panchang from the app (src/ui/widgetBridge.ts), keeps it for the
 * home-screen widget and redraws the widget.
 */
@CapacitorPlugin(name = "SanathaniWidget")
public class WidgetPlugin extends Plugin {
    static final String PREFS = "sanathani_widget";
    static final String KEY = "json";

    @PluginMethod
    public void setData(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
        PanchangWidget.updateAll(context);
        call.resolve(new JSObject());
    }
}
