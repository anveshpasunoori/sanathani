package com.anveshpasunoori.sanathani;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The home-screen widget's data bridge lives in this app, not in an npm plugin.
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
