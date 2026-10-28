package com.anveshpasunoori.sanathani;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Home-screen widget: today's thithi and nakshatra (the ones prevailing now), Rahu Kalam, sunrise
 * and sunset, and the day's festival or family event. The data comes ready-made from the app for
 * two weeks ahead (see src/data/widget.ts), so the widget needs no network and no calculation.
 */
public class PanchangWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, render(context));
    }

    /** Redraws every placed widget, e.g. after the app sends new data. */
    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PanchangWidget.class));
        for (int id : ids) manager.updateAppWidget(id, render(context));
    }

    private static RemoteViews render(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_panchang);
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_root,
            PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        String json = context.getSharedPreferences(WidgetPlugin.PREFS, Context.MODE_PRIVATE).getString(WidgetPlugin.KEY, null);
        try {
            JSONObject data = new JSONObject(json);
            JSONObject day = today(data.getJSONArray("days"));
            if (day == null) throw new IllegalStateException("no data for today");
            JSONObject labels = data.getJSONObject("labels");
            // ISO-8601 UTC instants sort as text, so times are compared as strings (no java.time before Android 8).
            String now = isoNow();
            views.setTextViewText(R.id.widget_heading, day.getString("heading"));
            views.setTextViewText(R.id.widget_month, day.getString("month") + " · " + data.getString("place"));
            views.setTextViewText(R.id.widget_thithi, labels.getString("thithi") + ": " + current(day.getJSONArray("tithis"), now));
            views.setTextViewText(R.id.widget_nakshatra, labels.getString("nakshatra") + ": " + current(day.getJSONArray("nakshatras"), now));
            JSONObject rahu = day.getJSONObject("rahu");
            boolean rahuNow = now.compareTo(rahu.getString("start")) >= 0 && now.compareTo(rahu.getString("end")) < 0;
            views.setTextViewText(R.id.widget_rahu, "⚠ " + labels.getString("rahu") + ": " + rahu.getString("text") + (rahuNow ? " · " + labels.getString("now") : ""));
            views.setTextViewText(R.id.widget_sun, "🌅 " + day.getString("sunrise") + "   🌇 " + day.getString("sunset"));
            String note = firstOf(day.getJSONArray("festivals"), "🪔 ");
            if (note == null) note = firstOf(day.getJSONArray("family"), "🙏 ");
            if (note == null && data.has("nextFamily")) note = "🗓 " + data.getString("nextFamily");
            views.setViewVisibility(R.id.widget_note, note == null ? View.GONE : View.VISIBLE);
            if (note != null) views.setTextViewText(R.id.widget_note, note);
        } catch (Exception e) {
            // No data yet (the app hasn't been opened since install) or it has run out: ask to open the app.
            views.setTextViewText(R.id.widget_heading, "Sanathani");
            views.setTextViewText(R.id.widget_month, "");
            views.setTextViewText(R.id.widget_thithi, context.getString(R.string.widget_open_app));
            views.setTextViewText(R.id.widget_nakshatra, "");
            views.setTextViewText(R.id.widget_rahu, "");
            views.setTextViewText(R.id.widget_sun, "");
            views.setViewVisibility(R.id.widget_note, View.GONE);
        }
        return views;
    }

    /** The entry for today's date on the phone (the app's dates are civil dates in the user's place). */
    private static JSONObject today(JSONArray days) throws Exception {
        String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        for (int i = 0; i < days.length(); i++) {
            if (days.getJSONObject(i).getString("date").equals(date)) return days.getJSONObject(i);
        }
        return null;
    }

    /** The span prevailing now: the first that hasn't ended yet. */
    private static String current(JSONArray spans, String now) throws Exception {
        for (int i = 0; i < spans.length(); i++) {
            JSONObject s = spans.getJSONObject(i);
            if (s.getString("ends").compareTo(now) > 0) return s.getString("name");
        }
        return spans.getJSONObject(spans.length() - 1).getString("name");
    }

    private static String isoNow() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date());
    }

    private static String firstOf(JSONArray items, String prefix) throws Exception {
        return items.length() > 0 ? prefix + items.getString(0) : null;
    }
}
