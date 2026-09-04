package com.exzyo.geminitranslator;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import java.util.Locale;
import android.content.Intent;
import android.net.Uri;
import android.media.MediaScannerConnection;
import android.widget.Toast;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
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
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.BufferedInputStream;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.net.CookieHandler;
import java.net.CookiePolicy;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;

@CapacitorPlugin(name = "NativeAndroidBridge")
public class NativeAndroidBridgePlugin extends Plugin {
    private static final String TAG = "NativeAndroidBridge";
    private static final String CHANNEL_ID = "gemini_translator_progress";
    private static final String CHANNEL_ID_COMPLETION = "gemini_completion_alerts";
    private static final int NOTIFICATION_ID = 1001;
    private static final int COMPLETE_NOTIFICATION_ID = 1002;
    private static final String DEFAULT_UA = "Mozilla/5.0 (Linux; Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0";

    private PowerManager.WakeLock wakeLock = null;
    private NotificationManager notificationManager = null;
    private boolean isChannelCreated = false;

    private void ensureNotificationChannel() {
        if (isChannelCreated || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Context context = getContext();
        notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            // 1. Progress channel (silent ongoing)
            NotificationChannel progressChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Translation & Task Progress",
                    NotificationManager.IMPORTANCE_LOW
            );
            progressChannel.setDescription("Shows real-time progress for active book translations and EPUB merges");
            progressChannel.setSound(null, null);
            progressChannel.enableVibration(false);
            notificationManager.createNotificationChannel(progressChannel);

            // 2. Completion alert channel (high priority with chime & vibration)
            NotificationChannel completionChannel = new NotificationChannel(
                    CHANNEL_ID_COMPLETION,
                    "Task Completion Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            completionChannel.setDescription("Alerts when translations, novel downloads, and EPUB exports finish");
            completionChannel.enableVibration(true);
            completionChannel.setVibrationPattern(new long[]{0, 250, 100, 250});
            completionChannel.enableLights(true);
            notificationManager.createNotificationChannel(completionChannel);

            isChannelCreated = true;
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        try {
            Context context = getContext();
            boolean granted = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    granted = false;
                    Activity activity = getActivity();
                    if (activity != null) {
                        activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("granted", granted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Permission error: " + e.getMessage());
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
    public void showCompletionNotification(PluginCall call) {
        try {
            ensureNotificationChannel();
            Context context = getContext();
            String title = call.getString("title", "Task Finished! 🎉");
            String message = call.getString("message", "Your action has completed.");

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
            );

            NotificationCompat.Builder doneBuilder = new NotificationCompat.Builder(context, CHANNEL_ID_COMPLETION)
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setPriority(NotificationCompat.PRIORITY_HIGH);

            if (notificationManager == null) {
                notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            }
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
                notificationManager.notify(COMPLETE_NOTIFICATION_ID, doneBuilder.build());
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Completion Notification Error: " + e.getMessage());
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
                String title = call.getString("title", "Book Completed! 🎉");
                String message = call.getString("message", "Translation completed successfully. Tap to open.");
                
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                        context, 0, launchIntent,
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
                );

                NotificationCompat.Builder doneBuilder = new NotificationCompat.Builder(context, CHANNEL_ID_COMPLETION)
                        .setSmallIcon(android.R.drawable.stat_sys_download_done)
                        .setContentTitle(title)
                        .setContentText(message)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true)
                        .setDefaults(Notification.DEFAULT_ALL)
                        .setPriority(NotificationCompat.PRIORITY_HIGH);

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
                    Log.d(TAG, " WakeLock Acquired - Background execution locked active!");
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
                Log.d(TAG, " WakeLock Released.");
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
                builder.setTitle(" Cloudflare Security Verification");

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

                // Carry cookies from the in-app WebView challenge/session into API requests.
                String webViewCookies = CookieManager.getInstance().getCookie("https://www.pixiv.net/");
                if (webViewCookies != null && !webViewCookies.isEmpty()) cookies = webViewCookies;

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
    public void webDavRequestNative(PluginCall call) {
        new Thread(() -> {
            try {
                String targetUrl = call.getString("url");
                if (targetUrl == null || targetUrl.isEmpty()) {
                    call.reject("Missing URL");
                    return;
                }
                String method = call.getString("method", "GET").toUpperCase();
                String body = call.getString("body", null);
                JSObject headers = call.getObject("headers");

                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(35000);
                conn.setInstanceFollowRedirects(true);

                // Set HTTP method (with reflection fallback for WebDAV custom verbs like PROPFIND, MKCOL)
                try {
                    conn.setRequestMethod(method);
                } catch (ProtocolException pe) {
                    try {
                        Class<?> currentClass = conn.getClass();
                        Field methodField = null;
                        while (currentClass != null && methodField == null) {
                            try {
                                methodField = currentClass.getDeclaredField("method");
                            } catch (NoSuchFieldException e) {
                                currentClass = currentClass.getSuperclass();
                            }
                        }
                        if (methodField != null) {
                            methodField.setAccessible(true);
                            methodField.set(conn, method);
                        }
                    } catch (Exception re) {
                        Log.w(TAG, "WebDAV reflection method override failed: " + re.getMessage());
                    }
                }

                if (headers != null) {
                    Iterator<String> it = headers.keys();
                    while (it.hasNext()) {
                        String k = it.next();
                        conn.setRequestProperty(k, headers.getString(k));
                    }
                }

                if (body != null && !body.isEmpty()) {
                    conn.setDoOutput(true);
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                        os.write(bytes, 0, bytes.length);
                    }
                }

                int status = conn.getResponseCode();
                InputStream is = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
                String responseData = "";
                if (is != null) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                    reader.close();
                    responseData = sb.toString();
                }
                conn.disconnect();

                JSObject ret = new JSObject();
                ret.put("status", status);
                ret.put("data", responseData);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "webDavRequestNative error: " + e.getMessage(), e);
                call.reject("WebDAV Error: " + e.getMessage());
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

        private void updateNotification(String title, String message, int progress, boolean ongoing) {
        try {
            Context context = getContext();
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.stat_sys_download)
                        .setContentTitle(title)
                        .setContentText(message)
                        .setOngoing(ongoing)
                        .setProgress(100, progress, progress == 0 && ongoing)
                        .setPriority(NotificationCompat.PRIORITY_LOW);
                manager.notify(NOTIFICATION_ID, builder.build());
            }
        } catch (Exception e) {
            Log.w(TAG, "Notification error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String downloadUrl = call.getString("url", "https://github.com/ExZyO/Gemini-Translator/releases/download/latest/GeminiTranslator.apk");
        Context context = getContext();

        new Thread(() -> {
            try {
                updateNotification("Gemini Translator Updater", "Downloading update...", 0, true);

                File downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (downloadDir == null || !downloadDir.exists()) {
                    downloadDir = context.getCacheDir();
                }
                File targetFile = new File(downloadDir, "GeminiTranslator_update.apk");
                if (targetFile.exists()) {
                    targetFile.delete();
                }

                URL url = new URL(downloadUrl);
                HttpURLConnection conn = null;
                int redirects = 0;
                int status = 0;

                while (redirects < 10) {
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) GeminiTranslator/8.6");
                    conn.setRequestProperty("Accept", "application/octet-stream, application/vnd.android.package-archive, */*");
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(35000);
                    conn.connect();

                    status = conn.getResponseCode();
                    if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM ||
                        status == 307 || status == 308 || status == 302 || status == 301) {
                        String newUrl = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (newUrl == null || newUrl.isEmpty()) {
                            throw new java.io.IOException("Update server redirected without Location header");
                        }
                        url = new URL(newUrl);
                        redirects++;
                    } else if (status >= 200 && status < 300) {
                        break;
                    } else {
                        conn.disconnect();
                        throw new java.io.IOException("Update download returned HTTP " + status);
                    }
                }

                int totalLength = conn.getContentLength();
                InputStream in = new BufferedInputStream(conn.getInputStream());
                OutputStream out = new FileOutputStream(targetFile);

                byte[] buf = new byte[8192];
                int count;
                long total = 0;
                long lastNotifTime = 0;
                while ((count = in.read(buf)) != -1) {
                    total += count;
                    out.write(buf, 0, count);
                    long now = System.currentTimeMillis();
                    if (totalLength > 0 && now - lastNotifTime > 500) {
                        int progress = (int) ((total * 100) / totalLength);
                        updateNotification("Gemini Translator Updater", "Downloading update (" + progress + "%)...", progress, true);
                        lastNotifTime = now;
                    }
                }

                out.flush();
                out.close();
                in.close();
                conn.disconnect();

                if (targetFile.length() < 1000000) {
                    throw new java.io.IOException("Downloaded update APK file is incomplete (" + targetFile.length() + " bytes).");
                }

                updateNotification("Gemini Translator Updater", "Download complete. Starting installation...", 100, false);

                // Prompt for unknown sources permission if needed on Android 8+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!context.getPackageManager().canRequestPackageInstalls()) {
                        Intent manageIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + context.getPackageName()));
                        manageIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(manageIntent);
                        updateNotification("Gemini Translator Updater", "Please enable 'Install unknown apps', then tap Update again.", 0, false);
                        call.reject("Please enable 'Install unknown apps' permission for Gemini Translator, then tap Update again.");
                        return;
                    }
                }

                // Trigger Android Package Installer with explicit URI permissions
                Uri apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", targetFile);
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                installIntent.setClipData(android.content.ClipData.newRawUri("GeminiTranslatorUpdate", apkUri));

                // Explicitly grant permissions to resolved activities and all common OEM package installers
                try {
                    List<ResolveInfo> resInfoList = context.getPackageManager().queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY);
                    for (ResolveInfo resolveInfo : resInfoList) {
                        String packageName = resolveInfo.activityInfo.packageName;
                        context.grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    }
                } catch (Exception ignored) {}

                String[] commonInstallers = {
                    "com.google.android.packageinstaller",
                    "com.android.packageinstaller",
                    "com.samsung.android.packageinstaller",
                    "com.miui.packageinstaller",
                    "com.coloros.packageinstaller",
                    "com.vivo.packageinstaller"
                };
                for (String pkg : commonInstallers) {
                    try {
                        context.grantUriPermission(pkg, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (Exception ignored) {}
                }

                context.startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Package installer launched");
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "APK Auto-install error: " + e.getMessage(), e);
                updateNotification("Gemini Translator Updater", "Update failed: " + e.getMessage(), 0, false);
                call.reject("Failed to install update: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void fetchNative(PluginCall call) {
        String urlStr = call.getString("url");
        if (urlStr == null || urlStr.isEmpty()) {
            call.reject("Missing URL");
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(20000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");

                int status = conn.getResponseCode();
                if (status >= 300 && status < 400) {
                    String loc = conn.getHeaderField("Location");
                    if (loc != null) {
                        conn.disconnect();
                        url = new URL(loc);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                    }
                }

                InputStream is = conn.getInputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                reader.close();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("status", status);
                ret.put("data", sb.toString());
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Native fetch error: " + e.getMessage(), e);
                call.reject("Native fetch error: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        try {
            Context context = getContext();
            String fileName = call.getString("fileName", "book.epub");
            String path = call.getString("path", "");
            String mimeType = call.getString("mimeType", "application/epub+zip");

            File targetFile = null;
            if (path != null && !path.isEmpty()) targetFile = new File(path);
            if (targetFile == null || !targetFile.exists()) targetFile = new File(context.getCacheDir(), fileName);

            if (!targetFile.exists()) {
                call.reject("File not found to share: " + fileName);
                return;
            }

            Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", targetFile);
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(shareIntent, "Save or Send " + fileName + " with...");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Share error: " + e.getMessage());
        }
    }

    private TextToSpeech nativeTts = null;
    private boolean isNativeTtsReady = false;

    private void ensureNativeTts() {
        if (nativeTts == null) {
            nativeTts = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS) {
                    nativeTts.setLanguage(Locale.US);
                    isNativeTtsReady = true;
                    Log.d(TAG, " Native Android TextToSpeech initialized successfully!");
                }
            });
        }
    }

    @PluginMethod
    public void speakNativeTts(PluginCall call) {
        try {
            ensureNativeTts();
            String text = call.getString("text", "");
            Double dRate = call.getDouble("rate", 1.0); float rate = dRate != null ? dRate.floatValue() : 1.0f;
            
            if (nativeTts != null && isNativeTtsReady && text != null && !text.isEmpty()) {
                nativeTts.setSpeechRate(rate);
                nativeTts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "gemini_reader_tts");
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                call.reject("Native TTS not ready");
            }
        } catch (Exception e) {
            call.reject("Native TTS error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopNativeTts(PluginCall call) {
        try {
            if (nativeTts != null) {
                nativeTts.stop();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Stop TTS error: " + e.getMessage());
        }
    }

    private final java.util.Map<String, FileOutputStream> chunkStreams = new java.util.concurrent.ConcurrentHashMap<>();

    @PluginMethod
    public void saveBlobChunk(PluginCall call) {
        try {
            Context context = getContext();
            String transferId = call.getString("transferId", "default");
            String fileName = call.getString("fileName", "book.epub");
            String chunkBase64 = call.getString("chunkBase64", "");
            boolean isFirst = call.getBoolean("isFirst", false);
            boolean isLast = call.getBoolean("isLast", false);
            String mimeType = call.getString("mimeType", "application/epub+zip");
            boolean openChooser = call.getBoolean("openChooser", false);

            File cacheFile = new File(context.getCacheDir(), fileName);
            if (isFirst) {
                if (cacheFile.exists()) cacheFile.delete();
                FileOutputStream fos = new FileOutputStream(cacheFile, false);
                chunkStreams.put(transferId, fos);
            }

            FileOutputStream fos = chunkStreams.get(transferId);
            if (fos == null) {
                fos = new FileOutputStream(cacheFile, true);
                chunkStreams.put(transferId, fos);
            }

            if (chunkBase64 != null && !chunkBase64.isEmpty()) {
                byte[] chunkBytes = Base64.decode(chunkBase64, Base64.NO_WRAP);
                fos.write(chunkBytes);
                fos.flush();
            }

            if (isLast) {
                try {
                    fos.close();
                } catch (Exception ignored) {}
                chunkStreams.remove(transferId);

                boolean mediaStoreSaved = false;
                String savedPath = "/storage/emulated/0/Download/GeminiTranslator/" + fileName;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GeminiTranslator");
                        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                        Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                        if (uri != null) {
                            try (InputStream in = new java.io.FileInputStream(cacheFile); OutputStream out = context.getContentResolver().openOutputStream(uri)) {
                                byte[] buf = new byte[65536];
                                int len;
                                while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
                                out.flush();
                            }
                            values.clear();
                            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                            context.getContentResolver().update(uri, values, null, null);
                            mediaStoreSaved = true;
                        }
                    } catch (Exception msErr) {
                        Log.w(TAG, "Chunked MediaStore save fallback: " + msErr.getMessage());
                    }
                }

                if (!mediaStoreSaved) {
                    try {
                        File pubDownloads = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "GeminiTranslator");
                        if (pubDownloads.exists() || pubDownloads.mkdirs()) {
                            File dest = new File(pubDownloads, fileName);
                            try (InputStream in = new java.io.FileInputStream(cacheFile); OutputStream out = new FileOutputStream(dest)) {
                                byte[] buf = new byte[65536];
                                int len;
                                while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
                                out.flush();
                            }
                            MediaScannerConnection.scanFile(context, new String[]{dest.getAbsolutePath()}, new String[]{mimeType}, null);
                            savedPath = dest.getAbsolutePath();
                        }
                    } catch (Exception pubErr) {
                        Log.w(TAG, "Chunked public download save: " + pubErr.getMessage());
                    }
                }

                final String finalToastPath = savedPath;
                new Handler(Looper.getMainLooper()).post(() -> {
                    Toast.makeText(context, " Saved: " + fileName + "\n Download/GeminiTranslator", Toast.LENGTH_LONG).show();
                });

                if (openChooser) {
                    try {
                        Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", cacheFile);
                        Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                        viewIntent.setDataAndType(contentUri, mimeType);
                        viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        Intent chooser = Intent.createChooser(viewIntent, "Open " + fileName + " with...");
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(chooser);
                    } catch (Exception e) {}
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("path", savedPath);
                ret.put("fileName", fileName);
                call.resolve(ret);
                return;
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("chunkSaved", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "saveBlobChunk error: " + e.getMessage(), e);
            call.reject("Chunk save error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void saveAndOpenFile(PluginCall call) {
        try {
            Context context = getContext();
            String fileName = call.getString("fileName", "translated_book.epub");
            String base64Data = call.getString("base64", "");
            String mimeType = call.getString("mimeType", "application/epub+zip");

            if (base64Data == null || base64Data.isEmpty()) {
                call.reject("No file data provided");
                return;
            }

            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            String savedPath = "";
            Uri fileUri = null;
            boolean mediaStoreSaved = false;

            // 1. Android 10+ (API 29+) Scoped Storage via MediaStore
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GeminiTranslator");
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        OutputStream os = context.getContentResolver().openOutputStream(uri);
                        if (os != null) {
                            os.write(bytes);
                            os.flush();
                            os.close();
                        }
                        values.clear();
                        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        context.getContentResolver().update(uri, values, null, null);
                        fileUri = uri;
                        savedPath = "/storage/emulated/0/Download/GeminiTranslator/" + fileName;
                        mediaStoreSaved = true;
                        Log.d(TAG, " Saved file via MediaStore to: " + savedPath);
                    }
                } catch (Exception msErr) {
                    Log.w(TAG, "MediaStore save fallback: " + msErr.getMessage());
                }
            }

            // 2. Direct File System cache write (for in-app reader & file provider)
            File cacheFile = new File(context.getCacheDir(), fileName);
            try (FileOutputStream fos = new FileOutputStream(cacheFile)) {
                fos.write(bytes);
                fos.flush();
            }

            // 3. Fallback to public Download directory only if MediaStore wasn't used
            if (!mediaStoreSaved) {
                try {
                    File pubDownloads = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "GeminiTranslator");
                    if (pubDownloads.exists() || pubDownloads.mkdirs()) {
                        File dest = new File(pubDownloads, fileName);
                        try (FileOutputStream fos = new FileOutputStream(dest)) {
                            fos.write(bytes);
                            fos.flush();
                        }
                        MediaScannerConnection.scanFile(context, new String[]{dest.getAbsolutePath()}, new String[]{mimeType}, null);
                        savedPath = dest.getAbsolutePath();
                    }
                } catch (Exception pubErr) {
                    Log.w(TAG, "Public downloads direct write ignored: " + pubErr.getMessage());
                }
            }

            if (savedPath.isEmpty()) {
                savedPath = cacheFile.getAbsolutePath();
            }

            // Show Native Android Toast
            final String toastPath = savedPath;
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context, " Saved: " + fileName + "\n Folder: Download/GeminiTranslator", Toast.LENGTH_LONG).show();
            });

            // Trigger System "Open With" Chooser only if explicitly requested
            boolean openChooser = call.getBoolean("openChooser", false);
            if (openChooser) {
                try {
                    Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", cacheFile);
                    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                    viewIntent.setDataAndType(contentUri, mimeType);
                    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    Intent chooser = Intent.createChooser(viewIntent, "Open " + fileName + " with (Moon+ Reader / ReadEra)...");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(chooser);
                } catch (Exception launchErr) {
                    Log.w(TAG, "Chooser launch optional notice: " + launchErr.getMessage());
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("path", savedPath);
            ret.put("fileName", fileName);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Save file error: " + e.getMessage(), e);
            call.reject("Failed to save file: " + e.getMessage());
        }
    }
}
