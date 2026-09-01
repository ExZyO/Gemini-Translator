package com.exzyo.geminitranslator;

import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.CookieHandler;
import java.net.CookiePolicy;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;

@CapacitorPlugin(name = "NativeAndroidBridge")
public class NativeAndroidBridgePlugin extends Plugin {
    private static final String TAG = "NativeAndroidBridge";
    private static final String CHANNEL_ID = "gemini_translator_progress";
    private static final int NOTIFICATION_ID = 1001;
    private static final int COMPLETE_NOTIFICATION_ID = 1002;
    private static final String DEFAULT_UA = "Mozilla/5.0 (Linux; Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0";

    private PowerManager.WakeLock wakeLock = null;
    private NotificationManager notificationManager = null;
    private boolean isChannelCreated = false;

    private void ensureNotificationChannel() {
        if (isChannelCreated || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Context context = getContext();
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Translation & Merge Progress",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows real-time progress for active book translations and EPUB merges");
        channel.setSound(null, null);
        channel.enableVibration(false);

        notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.createNotificationChannel(channel);
            isChannelCreated = true;
        }
    }

    @PluginMethod
    public void showProgressNotification(PluginCall call) {
        try {
            ensureNotificationChannel();
            Context context = getContext();
            String title = call.getString("title", "Translating Book...");
            String message = call.getString("message", "Processing chapters...");
            int progress = call.getInt("progress", 0);
            boolean ongoing = call.getBoolean("ongoing", true);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_sys_download)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setContentIntent(pendingIntent)
                    .setOngoing(ongoing)
                    .setOnlyAlertOnce(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW);

            if (progress >= 0 && progress <= 100) {
                builder.setProgress(100, progress, false);
            } else {
                builder.setProgress(0, 0, true);
            }

            if (notificationManager == null) {
                notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            }
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, builder.build());
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Notification error: " + e.getMessage(), e);
            call.reject("Notification Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearProgressNotification(PluginCall call) {
        try {
            Context context = getContext();
            if (notificationManager == null) {
                notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            }
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }

            boolean notifyDone = call.getBoolean("notifyDone", false);
            if (notifyDone) {
                String title = call.getString("title", "Book Completed! ✨");
                String message = call.getString("message", "Translation completed successfully. Tap to open.");
                
                Intent launchIntent = new Intent(context, MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                        context, 0, launchIntent,
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
                );

                NotificationCompat.Builder doneBuilder = new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.stat_sys_download_done)
                        .setContentTitle(title)
                        .setContentText(message)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);

                if (notificationManager != null) {
                    notificationManager.notify(COMPLETE_NOTIFICATION_ID, doneBuilder.build());
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Clear Notification Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openWithReader(PluginCall call) {
        try {
            Context context = getContext();
            String path = call.getString("path", "");
            String fileName = call.getString("fileName", "book.epub");

            File targetFile = null;
            if (path != null && !path.isEmpty()) {
                targetFile = new File(path);
            }
            if (targetFile == null || !targetFile.exists()) {
                File downloadsDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "GeminiTranslator");
                targetFile = new File(downloadsDir, fileName);
            }
            if (!targetFile.exists()) {
                targetFile = new File(context.getCacheDir(), fileName);
            }

            if (!targetFile.exists()) {
                call.reject("EPUB file not found on disk: " + fileName);
                return;
            }

            Uri contentUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    targetFile
            );

            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(contentUri, "application/epub+zip");
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(viewIntent, "Open EPUB with (Moon+ Reader / ReadEra)...");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("uri", contentUri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open reader: " + e.getMessage(), e);
            call.reject("Open in Reader Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void acquireWakeLock(PluginCall call) {
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (wakeLock == null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GeminiTranslator::WorkLock");
                }
                if (!wakeLock.isHeld()) {
                    wakeLock.acquire(2 * 60 * 60 * 1000L);
                    Log.d(TAG, "🔋 WakeLock Acquired - Background execution locked active!");
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("locked", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("WakeLock Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void releaseWakeLock(PluginCall call) {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "🔋 WakeLock Released.");
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("locked", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("WakeLock Release Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void triggerHaptic(PluginCall call) {
        try {
            Context context = getContext();
            String type = call.getString("type", "milestone");
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if ("success".equalsIgnoreCase(type)) {
                        long[] timings = {0, 40, 60, 40};
                        int[] amplitudes = {0, 200, 0, 255};
                        vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
                    } else if ("error".equalsIgnoreCase(type)) {
                        vibrator.vibrate(VibrationEffect.createOneShot(120, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(VibrationEffect.createOneShot(25, 120));
                    }
                } else {
                    vibrator.vibrate(35);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Haptic Error: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // TACHIYOMI / MIHON IN-APP CLOUDFLARE TURNSTILE RESOLVER WEBVIEW
    // ══════════════════════════════════════════════════════════════════════
    @PluginMethod
    public void resolveCloudflare(PluginCall call) {
        String targetUrl = call.getString("url");
        if (targetUrl == null || targetUrl.isEmpty()) {
            call.reject("Missing target URL");
            return;
        }

        Handler mainHandler = new Handler(Looper.getMainLooper());
        mainHandler.post(() -> {
            try {
                Context context = getActivity();
                if (context == null) {
                    call.reject("Activity context not available");
                    return;
                }

                AlertDialog.Builder builder = new AlertDialog.Builder(context);
                builder.setTitle("🛡️ Cloudflare Security Verification");

                LinearLayout layout = new LinearLayout(context);
                layout.setOrientation(LinearLayout.VERTICAL);
                layout.setPadding(20, 20, 20, 20);

                TextView tvInfo = new TextView(context);
                tvInfo.setText("Verifying with website... If a checkbox appears, tap it.");
                tvInfo.setTextSize(13);
                layout.addView(tvInfo);

                ProgressBar progressBar = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
                progressBar.setIndeterminate(true);
                layout.addView(progressBar);

                WebView webView = new WebView(context);
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setUserAgentString(DEFAULT_UA);

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    cookieManager.setAcceptThirdPartyCookies(webView, true);
                }

                LinearLayout.LayoutParams wvParams = new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, 800
                );
                webView.setLayoutParams(wvParams);
                layout.addView(webView);

                builder.setView(layout);
                builder.setNegativeButton("Cancel", (dialog, which) -> {
                    call.reject("Verification cancelled by user.");
                });

                AlertDialog dialog = builder.create();
                dialog.setCanceledOnTouchOutside(false);

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        
                        String cookies = cookieManager.getCookie(url);
                        view.evaluateJavascript("document.documentElement.outerHTML", html -> {
                            if (html != null && html.length() > 500 && !html.contains("cf-browser-verification") && !html.contains("Shields are up!")) {
                                try {
                                    String cleanHtml = html;
                                    try {
                                        cleanHtml = new org.json.JSONTokener(html).nextValue().toString();
                                    } catch (Exception parseErr) {
                                        Log.w(TAG, "HTML tokener parse fallback");
                                    }
                                    
                                    JSObject ret = new JSObject();
                                    ret.put("success", true);
                                    ret.put("cookies", cookies != null ? cookies : "");
                                    ret.put("html", cleanHtml);
                                    ret.put("url", url);

                                    if (dialog.isShowing()) {
                                        dialog.dismiss();
                                    }
                                    call.resolve(ret);
                                } catch (Exception e) {
                                    Log.e(TAG, "Extraction error: " + e.getMessage());
                                }
                            }
                        });
                    }
                });

                webView.loadUrl(targetUrl);
                dialog.show();
            } catch (Exception e) {
                Log.e(TAG, "Resolver error: " + e.getMessage(), e);
                call.reject("Resolver error: " + e.getMessage());
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // NATIVE CORS-FREE HTTP CRAWLER
    // ══════════════════════════════════════════════════════════════════════
    @PluginMethod
    public void fetchUrlNative(PluginCall call) {
        new Thread(() -> {
            try {
                String targetUrl = call.getString("url");
                if (targetUrl == null || targetUrl.isEmpty()) {
                    call.reject("Missing target URL parameter");
                    return;
                }

                String userAgent = call.getString("userAgent", DEFAULT_UA);
                JSObject customHeaders = call.getObject("headers");

                String currentUrl = targetUrl;
                HttpURLConnection conn = null;
                int redirects = 0;
                int statusCode = 0;
                String cookies = "";

                while (redirects < 10) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(25000);
                    conn.setReadTimeout(35000);
                    conn.setInstanceFollowRedirects(false);

                    conn.setRequestProperty("User-Agent", userAgent);
                    conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
                    conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9,zh-CN,zh;q=0.8,ja;q=0.7");
                    conn.setRequestProperty("Cache-Control", "no-cache");
                    conn.setRequestProperty("Pragma", "no-cache");

                    if (!cookies.isEmpty()) {
                        conn.setRequestProperty("Cookie", cookies);
                    }

                    if (customHeaders != null) {
                        Iterator<String> keys = customHeaders.keys();
                        while (keys.hasNext()) {
                            String k = keys.next();
                            conn.setRequestProperty(k, customHeaders.getString(k));
                        }
                    }

                    statusCode = conn.getResponseCode();

                    List<String> setCookies = conn.getHeaderFields().get("Set-Cookie");
                    if (setCookies != null) {
                        for (String sc : setCookies) {
                            String part = sc.split(";")[0];
                            if (!part.isEmpty()) {
                                cookies = cookies.isEmpty() ? part : cookies + "; " + part;
                            }
                        }
                    }

                    if (statusCode == HttpURLConnection.HTTP_MOVED_TEMP || 
                        statusCode == HttpURLConnection.HTTP_MOVED_PERM || 
                        statusCode == 307 || statusCode == 308) {
                        String loc = conn.getHeaderField("Location");
                        if (loc != null && !loc.isEmpty()) {
                            if (!loc.startsWith("http")) {
                                loc = new URL(url, loc).toString();
                            }
                            currentUrl = loc;
                            conn.disconnect();
                            redirects++;
                            continue;
                        }
                    }
                    break;
                }

                if (conn == null) {
                    call.reject("Could not establish connection to " + targetUrl);
                    return;
                }

                InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line).append("\n");
                }
                reader.close();
                conn.disconnect();

                JSObject ret = new JSObject();
                ret.put("status", statusCode);
                ret.put("data", response.toString());
                ret.put("url", currentUrl);
                ret.put("cookies", cookies);

                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Native HTTP fetch failed: " + e.getMessage(), e);
                call.reject("Native HTTP Fetch Error: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void downloadBinaryNative(PluginCall call) {
        new Thread(() -> {
            try {
                String targetUrl = call.getString("url");
                if (targetUrl == null || targetUrl.isEmpty()) {
                    call.reject("Missing target URL parameter");
                    return;
                }

                String userAgent = call.getString("userAgent", DEFAULT_UA);
                String currentUrl = targetUrl;
                HttpURLConnection conn = null;
                int redirects = 0;
                int statusCode = 0;
                String cookies = "";

                while (redirects < 10) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(45000);
                    conn.setInstanceFollowRedirects(false);

                    conn.setRequestProperty("User-Agent", userAgent);
                    conn.setRequestProperty("Accept", "*/*");
                    conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
                    if (!cookies.isEmpty()) {
                        conn.setRequestProperty("Cookie", cookies);
                    }

                    statusCode = conn.getResponseCode();

                    List<String> setCookies = conn.getHeaderFields().get("Set-Cookie");
                    if (setCookies != null) {
                        for (String sc : setCookies) {
                            String part = sc.split(";")[0];
                            if (!part.isEmpty()) {
                                cookies = cookies.isEmpty() ? part : cookies + "; " + part;
                            }
                        }
                    }

                    if (statusCode == HttpURLConnection.HTTP_MOVED_TEMP || 
                        statusCode == HttpURLConnection.HTTP_MOVED_PERM || 
                        statusCode == 307 || statusCode == 308) {
                        String loc = conn.getHeaderField("Location");
                        if (loc != null && !loc.isEmpty()) {
                            if (!loc.startsWith("http")) {
                                loc = new URL(url, loc).toString();
                            }
                            currentUrl = loc;
                            conn.disconnect();
                            redirects++;
                            continue;
                        }
                    }
                    break;
                }

                if (conn == null || statusCode >= 400) {
                    call.reject("HTTP Error " + statusCode + " while downloading binary from " + currentUrl);
                    return;
                }

                InputStream is = conn.getInputStream();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[32768];
                int len;
                while ((len = is.read(buffer)) > 0) {
                    baos.write(buffer, 0, len);
                }
                is.close();
                conn.disconnect();

                byte[] binaryData = baos.toByteArray();
                String base64 = Base64.encodeToString(binaryData, Base64.NO_WRAP);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("status", statusCode);
                ret.put("size", binaryData.length);
                ret.put("base64", base64);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Native binary download failed: " + e.getMessage(), e);
                call.reject("Native Binary Download Error: " + e.getMessage());
            }
        }).start();
    }
}
