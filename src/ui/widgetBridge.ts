// Keeps the phone's home-screen widget fed: the next two weeks of Panchang (see data/widget.ts) are
// handed to the native side on launch, on return to the app, and a few seconds after events or
// settings change. The native plugin (SanathaniWidget) saves them for the widget and asks the
// system to redraw it. On the web there is no widget, so nothing happens.
import { App as NativeApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getState, subscribe } from '../data/store';
import { widgetData } from '../data/widget';
import { todayIn } from '../engine/tz';

interface SanathaniWidgetPlugin {
  setData(options: { json: string }): Promise<void>;
}

const Widget = registerPlugin<SanathaniWidgetPlugin>('SanathaniWidget');

let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;

async function push() {
  const s = getState();
  try {
    await Widget.setData({ json: JSON.stringify(widgetData(s, todayIn(s.settings.place.tz))) });
  } catch {
    // An app build without the widget plugin: nothing to update.
  }
}

export function startWidget() {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;
  push();
  NativeApp.addListener('resume', () => push());
  let last = getState();
  subscribe(() => {
    const s = getState();
    if (s.events === last.events && s.settings === last.settings) return;
    last = s;
    clearTimeout(timer);
    timer = setTimeout(push, 3000);
  });
}
