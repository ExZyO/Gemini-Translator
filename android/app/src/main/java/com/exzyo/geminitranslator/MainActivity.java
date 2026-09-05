package com.exzyo.geminitranslator;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAndroidBridgePlugin.class);
        registerPlugin(NativeEpubMergerPlugin.class);
        super.onCreate(savedInstanceState);

        // Enable Chrome remote debugging and verbose adb console output
        android.webkit.WebView.setWebContentsDebuggingEnabled(true);

        // Request runtime notification permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent Chromium / Android WebView from pausing timers, RAF, and Promises when backgrounded
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().onResume();
            }
            android.webkit.WebView.resumeTimers();
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        // Keep timers alive even when activity is completely stopped/covered
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().onResume();
            }
            android.webkit.WebView.resumeTimers();
        } catch (Exception ignored) {}
    }
}
