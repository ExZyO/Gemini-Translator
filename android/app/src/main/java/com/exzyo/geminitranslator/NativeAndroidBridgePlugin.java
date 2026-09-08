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
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.net.Uri;
import android.media.MediaScannerConnection;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.media.MediaMetadata;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.os.SystemClock;
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
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import android.provider.DocumentsContract;
import android.database.Cursor;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.text.SimpleDateFormat;

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
    private static final String CHANNEL_ID_AUDIO = "gemini_audio_playback";
    private static final int NOTIFICATION_ID = 1001;
    private static final int COMPLETE_NOTIFICATION_ID = 1002;
    private static final int AUDIO_NOTIFICATION_ID = 8888;
    private static final String DEFAULT_UA = "Mozilla/5.0 (Linux; Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0";

    public static final String ACTION_AUDIO_PLAY_PAUSE = "com.exzyo.geminitranslator.AUDIO_PLAY_PAUSE";
    public static final String ACTION_AUDIO_REWIND_5 = "com.exzyo.geminitranslator.AUDIO_REWIND_5";
    public static final String ACTION_AUDIO_FORWARD_5 = "com.exzyo.geminitranslator.AUDIO_FORWARD_5";
    public static final String ACTION_AUDIO_NEXT = "com.exzyo.geminitranslator.AUDIO_NEXT";
    public static final String ACTION_AUDIO_PREV = "com.exzyo.geminitranslator.AUDIO_PREV";

    private PowerManager.WakeLock wakeLock = null;
    private PowerManager.WakeLock audioWakeLock = null;
    private NotificationManager notificationManager = null;
    private BroadcastReceiver audioActionReceiver = null;
    private MediaSession mediaSession = null;
    private Bitmap cachedCoverBitmap = null;
    private String cachedCoverUrl = null;
    private boolean isFetchingCover = false;
    private String lastAudioTitle = "Audiobook";
    private String lastAudioBookTitle = "";
    private String lastAudioAuthor = "";
    private double lastAudioCurrentTime = 0.0;
    private double lastAudioDuration = 0.0;
    private double lastAudioRate = 1.0;
    private boolean lastAudioIsPlaying = false;
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

            // 3. Audio playback channel (media controls in notification center & lockscreen)
            NotificationChannel audioChannel = new NotificationChannel(
                    CHANNEL_ID_AUDIO,
                    "Audiobook Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            audioChannel.setDescription("Audiobook player controls in notification center");
            audioChannel.setSound(null, null);
            audioChannel.enableVibration(false);
            audioChannel.setShowBadge(false);
            notificationManager.createNotificationChannel(audioChannel);

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

            // Also update Foreground Service notification if running
            if (BackgroundWorkerService.isServiceRunning()) {
                try {
                    Intent updateIntent = new Intent(context, BackgroundWorkerService.class);
                    updateIntent.setAction(BackgroundWorkerService.ACTION_UPDATE);
                    updateIntent.putExtra("title", title);
                    updateIntent.putExtra("message", message);
                    updateIntent.putExtra("progress", progress);
                    context.startService(updateIntent);
                } catch (Exception ignored) {}
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

            // Stop background foreground service if running
            if (BackgroundWorkerService.isServiceRunning()) {
                try {
                    Intent stopIntent = new Intent(context, BackgroundWorkerService.class);
                    stopIntent.setAction(BackgroundWorkerService.ACTION_STOP);
                    context.startService(stopIntent);
                } catch (Exception ignored) {}
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

            // Stop background foreground service if running
            if (BackgroundWorkerService.isServiceRunning()) {
                try {
                    Intent stopIntent = new Intent(context, BackgroundWorkerService.class);
                    stopIntent.setAction(BackgroundWorkerService.ACTION_STOP);
                    context.startService(stopIntent);
                } catch (Exception ignored) {}
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

    private void evalAudioJs(final String js) {
        Activity act = getActivity();
        if (act != null) {
            act.runOnUiThread(() -> {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(js, null);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "evalAudioJs error: " + e.getMessage());
                }
            });
        }
    }

    private synchronized void ensureAudioReceiver() {
        if (audioActionReceiver != null) return;
        Context context = getContext();
        if (context == null) return;
        audioActionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                String action = intent.getAction();
                if (action == null) return;
                if (ACTION_AUDIO_PLAY_PAUSE.equals(action)) {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.togglePlay()");
                } else if (ACTION_AUDIO_REWIND_5.equals(action)) {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.skipBackward5()");
                } else if (ACTION_AUDIO_FORWARD_5.equals(action)) {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.skipForward5()");
                } else if (ACTION_AUDIO_NEXT.equals(action)) {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.nextTrack()");
                } else if (ACTION_AUDIO_PREV.equals(action)) {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.previousTrack()");
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_AUDIO_PLAY_PAUSE);
        filter.addAction(ACTION_AUDIO_REWIND_5);
        filter.addAction(ACTION_AUDIO_FORWARD_5);
        filter.addAction(ACTION_AUDIO_NEXT);
        filter.addAction(ACTION_AUDIO_PREV);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(audioActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(audioActionReceiver, filter);
            }
        } catch (Exception e) {
            Log.w(TAG, "Register audio receiver error: " + e.getMessage());
        }
    }

    private synchronized void ensureMediaSession() {
        if (mediaSession != null) return;
        Context context = getContext();
        if (context == null) return;
        try {
            mediaSession = new MediaSession(context, "GeminiAudioSession");
            mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
            mediaSession.setCallback(new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.play()");
                }

                @Override
                public void onPause() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.pause()");
                }

                @Override
                public void onSkipToNext() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.nextTrack()");
                }

                @Override
                public void onSkipToPrevious() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.previousTrack()");
                }

                @Override
                public void onFastForward() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.skipForward5()");
                }

                @Override
                public void onRewind() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.skipBackward5()");
                }

                @Override
                public void onSeekTo(long pos) {
                    double seconds = pos / 1000.0;
                    lastAudioCurrentTime = seconds;
                    updatePlaybackState(lastAudioIsPlaying, lastAudioCurrentTime, lastAudioRate);
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.seekTo(" + seconds + ")");
                }

                @Override
                public void onStop() {
                    evalAudioJs("window.SwiftAudioEngine && window.SwiftAudioEngine.Player && window.SwiftAudioEngine.Player.pause()");
                }

                @Override
                public boolean onMediaButtonEvent(Intent mediaButtonIntent) {
                    return super.onMediaButtonEvent(mediaButtonIntent);
                }
            });

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_MAIN);
            openAppIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, flags);
            mediaSession.setSessionActivity(contentPendingIntent);

            mediaSession.setActive(true);
        } catch (Exception e) {
            Log.e(TAG, "ensureMediaSession error: " + e.getMessage(), e);
        }
    }

    private void updatePlaybackState(boolean isPlaying, double currentTimeSec, double rate) {
        if (mediaSession == null) return;
        try {
            long posMs = (long) (Math.max(0, currentTimeSec) * 1000L);
            float speed = rate > 0 ? (float) rate : 1.0f;
            int state = isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
            long actions = PlaybackState.ACTION_PLAY
                    | PlaybackState.ACTION_PAUSE
                    | PlaybackState.ACTION_PLAY_PAUSE
                    | PlaybackState.ACTION_SKIP_TO_NEXT
                    | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                    | PlaybackState.ACTION_FAST_FORWARD
                    | PlaybackState.ACTION_REWIND
                    | PlaybackState.ACTION_SEEK_TO
                    | PlaybackState.ACTION_STOP;

            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                    .setActions(actions)
                    .setState(state, posMs, speed, SystemClock.elapsedRealtime());
            mediaSession.setPlaybackState(stateBuilder.build());
        } catch (Exception e) {
            Log.w(TAG, "updatePlaybackState error: " + e.getMessage());
        }
    }

    private void updateMediaMetadata(String title, String bookTitle, String author, double durationSec, Bitmap art) {
        if (mediaSession == null) return;
        try {
            long durMs = durationSec > 0 ? (long) (durationSec * 1000L) : -1L;
            String artist = (author != null && !author.isEmpty()) ? author : bookTitle;
            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, title != null ? title : "Audiobook")
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, artist != null ? artist : "")
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, bookTitle != null ? bookTitle : "")
                    .putLong(MediaMetadata.METADATA_KEY_DURATION, durMs);

            if (art != null && !art.isRecycled()) {
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, art);
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, art);
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, art);
            }
            mediaSession.setMetadata(metaBuilder.build());
        } catch (Exception e) {
            Log.w(TAG, "updateMediaMetadata error: " + e.getMessage());
        }
    }

    private void fetchCoverBitmapAsync(final String coverUrl) {
        if (coverUrl == null || coverUrl.trim().isEmpty()) {
            cachedCoverBitmap = null;
            cachedCoverUrl = null;
            return;
        }
        final String cleanUrl = coverUrl.trim();
        if (cleanUrl.equals(cachedCoverUrl) && cachedCoverBitmap != null && !cachedCoverBitmap.isRecycled()) {
            return;
        }
        if (isFetchingCover) return;
        isFetchingCover = true;

        new Thread(() -> {
            Bitmap decoded = null;
            try {
                if (cleanUrl.startsWith("data:image/")) {
                    int commaIdx = cleanUrl.indexOf(',');
                    if (commaIdx > 0) {
                        byte[] decodedBytes = Base64.decode(cleanUrl.substring(commaIdx + 1), Base64.DEFAULT);
                        decoded = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                    }
                } else if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                    URL url = new URL(cleanUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(10000);
                    conn.setRequestProperty("User-Agent", DEFAULT_UA);
                    conn.connect();
                    if (conn.getResponseCode() == 200) {
                        try (InputStream is = conn.getInputStream()) {
                            decoded = BitmapFactory.decodeStream(is);
                        }
                    }
                    conn.disconnect();
                } else if (cleanUrl.startsWith("file://") || cleanUrl.startsWith("/")) {
                    String path = cleanUrl.startsWith("file://") ? cleanUrl.substring(7) : cleanUrl;
                    File f = new File(path);
                    if (f.exists()) {
                        decoded = BitmapFactory.decodeFile(f.getAbsolutePath());
                    }
                }

                if (decoded != null) {
                    int w = decoded.getWidth();
                    int h = decoded.getHeight();
                    int maxDim = Math.max(w, h);
                    if (maxDim > 512) {
                        float ratio = 512f / maxDim;
                        int newW = Math.max(1, Math.round(w * ratio));
                        int newH = Math.max(1, Math.round(h * ratio));
                        Bitmap scaled = Bitmap.createScaledBitmap(decoded, newW, newH, true);
                        if (scaled != decoded) {
                            decoded.recycle();
                            decoded = scaled;
                        }
                    }

                    if (cachedCoverBitmap != null && cachedCoverBitmap != decoded && !cachedCoverBitmap.isRecycled()) {
                        try { cachedCoverBitmap.recycle(); } catch (Exception ignored) {}
                    }
                    cachedCoverBitmap = decoded;
                    cachedCoverUrl = cleanUrl;

                    Activity act = getActivity();
                    if (act != null) {
                        act.runOnUiThread(() -> {
                            try {
                                buildAndPostAudioNotification();
                            } catch (Exception e) {
                                Log.w(TAG, "Failed to repost audio notification after cover fetch: " + e.getMessage());
                            }
                        });
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "fetchCoverBitmapAsync error: " + e.getMessage());
            } finally {
                isFetchingCover = false;
            }
        }).start();
    }

    private synchronized void buildAndPostAudioNotification() {
        Context context = getContext();
        if (context == null) return;
        if (notificationManager == null) {
            notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        }
        if (notificationManager == null) return;

        ensureMediaSession();
        updatePlaybackState(lastAudioIsPlaying, lastAudioCurrentTime, lastAudioRate);
        updateMediaMetadata(lastAudioTitle, lastAudioBookTitle, lastAudioAuthor, lastAudioDuration, cachedCoverBitmap);

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setAction(Intent.ACTION_MAIN);
        openAppIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, flags);

        Intent prevIntent = new Intent(ACTION_AUDIO_PREV);
        PendingIntent prevPending = PendingIntent.getBroadcast(context, 10, prevIntent, flags);

        Intent rewIntent = new Intent(ACTION_AUDIO_REWIND_5);
        PendingIntent rewPending = PendingIntent.getBroadcast(context, 11, rewIntent, flags);

        Intent playPauseIntent = new Intent(ACTION_AUDIO_PLAY_PAUSE);
        PendingIntent playPausePending = PendingIntent.getBroadcast(context, 12, playPauseIntent, flags);

        Intent fwdIntent = new Intent(ACTION_AUDIO_FORWARD_5);
        PendingIntent fwdPending = PendingIntent.getBroadcast(context, 13, fwdIntent, flags);

        Intent nextIntent = new Intent(ACTION_AUDIO_NEXT);
        PendingIntent nextPending = PendingIntent.getBroadcast(context, 14, nextIntent, flags);

        String artistOrBook = (lastAudioAuthor != null && !lastAudioAuthor.isEmpty()) ? lastAudioAuthor : lastAudioBookTitle;
        if (artistOrBook == null || artistOrBook.isEmpty()) artistOrBook = "SwiftAudiobooks";

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(context, CHANNEL_ID_AUDIO);
        } else {
            builder = new Notification.Builder(context);
        }

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle();
        if (mediaSession != null) {
            mediaStyle.setMediaSession(mediaSession.getSessionToken());
        }
        mediaStyle.setShowActionsInCompactView(1, 2, 3);

        builder.setStyle(mediaStyle)
                .setContentTitle(lastAudioTitle)
                .setContentText(artistOrBook)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentPendingIntent)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setPriority(Notification.PRIORITY_LOW)
                .setOngoing(lastAudioIsPlaying)
                .setOnlyAlertOnce(true);

        if (lastAudioBookTitle != null && !lastAudioBookTitle.isEmpty()) {
            builder.setSubText(lastAudioBookTitle);
        }

        if (cachedCoverBitmap != null && !cachedCoverBitmap.isRecycled()) {
            builder.setLargeIcon(cachedCoverBitmap);
        }

        int playPauseIcon = lastAudioIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseText = lastAudioIsPlaying ? "Pause ⏸" : "Play ▶";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            builder.addAction(new Notification.Action.Builder(
                    Icon.createWithResource(context, android.R.drawable.ic_media_previous),
                    "⏮ Previous", prevPending).build());
            builder.addAction(new Notification.Action.Builder(
                    Icon.createWithResource(context, android.R.drawable.ic_media_rew),
                    "-5s", rewPending).build());
            builder.addAction(new Notification.Action.Builder(
                    Icon.createWithResource(context, playPauseIcon),
                    playPauseText, playPausePending).build());
            builder.addAction(new Notification.Action.Builder(
                    Icon.createWithResource(context, android.R.drawable.ic_media_ff),
                    "+5s", fwdPending).build());
            builder.addAction(new Notification.Action.Builder(
                    Icon.createWithResource(context, android.R.drawable.ic_media_next),
                    "⏭ Next", nextPending).build());
        } else {
            builder.addAction(android.R.drawable.ic_media_previous, "⏮ Previous", prevPending);
            builder.addAction(android.R.drawable.ic_media_rew, "-5s", rewPending);
            builder.addAction(playPauseIcon, playPauseText, playPausePending);
            builder.addAction(android.R.drawable.ic_media_ff, "+5s", fwdPending);
            builder.addAction(android.R.drawable.ic_media_next, "⏭ Next", nextPending);
        }

        Notification notification = builder.build();
        notificationManager.notify(AUDIO_NOTIFICATION_ID, notification);
    }

    private synchronized void acquireAudioWakeLock(String tag) {
        try {
            if (audioWakeLock == null) {
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    audioWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GeminiTranslator:AudioPlaybackWakeLock");
                    audioWakeLock.setReferenceCounted(false);
                }
            }
            if (audioWakeLock != null && !audioWakeLock.isHeld()) {
                audioWakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours
            }
        } catch (Exception e) {
            Log.w(TAG, "Audio wake lock acquire warning: " + e.getMessage());
        }
    }

    private synchronized void releaseAudioWakeLock() {
        try {
            if (audioWakeLock != null && audioWakeLock.isHeld()) {
                audioWakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void showAudioPlayerNotification(PluginCall call) {
        try {
            ensureNotificationChannel();
            ensureAudioReceiver();
            ensureMediaSession();

            String title = call.getString("title", "Audiobook");
            String bookTitle = call.getString("bookTitle", "");
            String author = call.getString("author", "");
            String cover = call.getString("cover", "");
            boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
            Double currentTime = call.getDouble("currentTime", 0.0);
            Double duration = call.getDouble("duration", 0.0);
            Double playbackRate = call.getDouble("playbackRate", 1.0);

            lastAudioTitle = title != null ? title : "Audiobook";
            lastAudioBookTitle = bookTitle != null ? bookTitle : "";
            lastAudioAuthor = author != null ? author : "";
            lastAudioIsPlaying = isPlaying;
            if (currentTime != null) lastAudioCurrentTime = currentTime;
            if (duration != null) lastAudioDuration = duration;
            if (playbackRate != null && playbackRate > 0) lastAudioRate = playbackRate;

            if (mediaSession != null) {
                mediaSession.setActive(true);
            }

            if (isPlaying) {
                acquireAudioWakeLock(lastAudioTitle);
            } else {
                releaseAudioWakeLock();
            }

            if (cover != null && !cover.isEmpty() && !cover.equals(cachedCoverUrl)) {
                fetchCoverBitmapAsync(cover);
            }

            buildAndPostAudioNotification();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "showAudioPlayerNotification error: " + e.getMessage(), e);
            call.reject("Audio notification error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void hideAudioPlayerNotification(PluginCall call) {
        try {
            ensureNotificationChannel();
            if (notificationManager != null) {
                notificationManager.cancel(AUDIO_NOTIFICATION_ID);
            }
            if (mediaSession != null) {
                mediaSession.setActive(false);
            }
            releaseAudioWakeLock();
            JSObject ret = new JSObject();
            ret.put("success", true);
            if (call != null) call.resolve(ret);
        } catch (Exception e) {
            if (call != null) call.reject(e.getMessage());
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
            String title = call.getString("title", "Gemini Translator Active");
            String message = call.getString("message", "Processing tasks in background...");

            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (wakeLock == null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GeminiTranslator::WorkLock");
                }
                if (!wakeLock.isHeld()) {
                    wakeLock.acquire(4 * 60 * 60 * 1000L);
                    Log.d(TAG, " WakeLock Acquired - Background execution locked active!");
                }
            }

            // Start Foreground Service to elevate Android process priority & prevent OS killing
            try {
                Intent serviceIntent = new Intent(context, BackgroundWorkerService.class);
                serviceIntent.setAction(BackgroundWorkerService.ACTION_START);
                serviceIntent.putExtra("title", title);
                serviceIntent.putExtra("message", message);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception se) {
                Log.w(TAG, "Could not start BackgroundWorkerService: " + se.getMessage());
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

            Context context = getContext();
            try {
                Intent serviceIntent = new Intent(context, BackgroundWorkerService.class);
                serviceIntent.setAction(BackgroundWorkerService.ACTION_STOP);
                context.startService(serviceIntent);
            } catch (Exception se) {
                Log.w(TAG, "Could not stop BackgroundWorkerService: " + se.getMessage());
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
    public void isBatteryOptimizationIgnored(PluginCall call) {
        try {
            Context context = getContext();
            boolean isIgnored = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    isIgnored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
                }
            }
            JSObject ret = new JSObject();
            ret.put("ignored", isIgnored);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Battery optimization check error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Request ignore battery optimizations error: " + e.getMessage());
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
                    String referer = call.getString("referer");
                    if (referer == null || referer.isEmpty()) {
                        try {
                            java.net.URI uri = new java.net.URI(currentUrl);
                            referer = uri.getScheme() + "://" + uri.getHost() + "/";
                        } catch (Exception ignored) {}
                    }
                    if (referer != null && !referer.isEmpty()) {
                        conn.setRequestProperty("Referer", referer);
                    }
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

    @PluginMethod
    public void downloadFileDirect(PluginCall call) {
        new Thread(() -> {
            HttpURLConnection conn = null;
            InputStream in = null;
            OutputStream out = null;
            Uri pendingUri = null;
            Context context = getContext();

            try {
                String targetUrl = call.getString("url");
                String fileName = call.getString("fileName");
                String treeUri = call.getString("treeUri");
                String subDir = call.getString("subDir");
                String mimeType = call.getString("mimeType", "audio/mpeg");
                String userAgent = call.getString("userAgent", DEFAULT_UA);

                if (targetUrl == null || targetUrl.trim().isEmpty()) {
                    call.reject("Missing download URL");
                    return;
                }
                if (fileName == null || fileName.trim().isEmpty()) {
                    fileName = "audiobook_track_" + System.currentTimeMillis() + ".mp3";
                }

                // 1. Establish HTTP connection following redirects
                String currentUrl = targetUrl != null ? targetUrl.trim().replace(" ", "%20") : "";
                int redirects = 0;
                int statusCode = 0;

                while (redirects < 10) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(60000);
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("User-Agent", userAgent);
                    conn.setRequestProperty("Accept", "*/*");
                    conn.setRequestProperty("Referer", "https://swiftaudiobooks.com/");

                    statusCode = conn.getResponseCode();
                    if (statusCode == HttpURLConnection.HTTP_MOVED_TEMP || 
                        statusCode == HttpURLConnection.HTTP_MOVED_PERM || 
                        statusCode == 307 || statusCode == 308) {
                        String loc = conn.getHeaderField("Location");
                        if (loc != null && !loc.isEmpty()) {
                            if (!loc.startsWith("http")) {
                                loc = new URL(url, loc).toString();
                            }
                            loc = loc.replace(" ", "%20");
                            currentUrl = loc;
                            conn.disconnect();
                            redirects++;
                            continue;
                        }
                    }
                    break;
                }

                if (conn == null || statusCode >= 400) {
                    call.reject("HTTP Error " + statusCode + " fetching audio from " + currentUrl);
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                in = conn.getInputStream();

                boolean safSaved = false;
                String savedPath = "";

                // 2. Open destination stream: SAF Document Tree
                if (treeUri != null && !treeUri.trim().isEmpty()) {
                    try {
                        Uri parsedTree = Uri.parse(treeUri);
                        String treeDocId = DocumentsContract.getTreeDocumentId(parsedTree);
                        Uri parentDocUri = DocumentsContract.buildDocumentUriUsingTree(parsedTree, treeDocId);
                        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(parsedTree, treeDocId);

                        Uri targetDocUri = null;
                        try (Cursor cursor = context.getContentResolver().query(
                                childrenUri,
                                new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME},
                                null, null, null)) {
                            if (cursor != null) {
                                int idIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                                int nameIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                                while (cursor.moveToNext()) {
                                    String name = cursor.getString(nameIdx);
                                    if (fileName.equalsIgnoreCase(name)) {
                                        String docId = cursor.getString(idIdx);
                                        targetDocUri = DocumentsContract.buildDocumentUriUsingTree(parsedTree, docId);
                                        break;
                                    }
                                }
                            }
                        } catch (Exception queryErr) {
                            Log.w(TAG, "SAF children query warning: " + queryErr.getMessage());
                        }

                        if (targetDocUri == null) {
                            targetDocUri = DocumentsContract.createDocument(context.getContentResolver(), parentDocUri, mimeType, fileName);
                        }

                        if (targetDocUri != null) {
                            out = context.getContentResolver().openOutputStream(targetDocUri, "wt");
                            safSaved = true;
                            savedPath = "📁 Saved in novel folder: " + fileName;
                        }
                    } catch (Exception safErr) {
                        Log.e(TAG, "SAF download output failed: " + safErr.getMessage(), safErr);
                    }
                }

                // 3. Fallback: MediaStore / Download folder
                if (!safSaved) {
                    String relativeSubDir = "GeminiTranslator/Audiobooks";
                    if (subDir != null && !subDir.trim().isEmpty()) {
                        String clean = subDir.trim().replaceAll("^[\\\\/]+", "").replaceAll("[\\\\/]+$", "");
                        if (!clean.isEmpty()) {
                            if (clean.toLowerCase().startsWith("download/") || clean.toLowerCase().startsWith("downloads/")) {
                                relativeSubDir = clean.replaceFirst("^(?i)downloads?/", "");
                            } else {
                                relativeSubDir = clean;
                            }
                        }
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + relativeSubDir);
                            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                            pendingUri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                            if (pendingUri != null) {
                                out = context.getContentResolver().openOutputStream(pendingUri);
                                savedPath = "/storage/emulated/0/Download/" + relativeSubDir + "/" + fileName;
                            }
                        } catch (Exception msErr) {
                            Log.w(TAG, "MediaStore.Downloads insert failed: " + msErr.getMessage());
                        }

                        if (out == null) {
                            try {
                                ContentValues values = new ContentValues();
                                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_MUSIC + "/" + relativeSubDir);
                                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                                pendingUri = context.getContentResolver().insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
                                if (pendingUri != null) {
                                    out = context.getContentResolver().openOutputStream(pendingUri);
                                    savedPath = "/storage/emulated/0/Music/" + relativeSubDir + "/" + fileName;
                                }
                            } catch (Exception audioMsErr) {
                                Log.w(TAG, "MediaStore.Audio insert failed: " + audioMsErr.getMessage());
                            }
                        }
                    }

                    if (out == null) {
                        try {
                            File pubDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), relativeSubDir);
                            if (!pubDir.exists()) pubDir.mkdirs();
                            File destFile = new File(pubDir, fileName);
                            out = new FileOutputStream(destFile);
                            savedPath = destFile.getAbsolutePath();
                        } catch (Exception fileErr) {
                            Log.w(TAG, "Public downloads direct file output failed: " + fileErr.getMessage());
                        }
                    }

                    if (out == null) {
                        try {
                            File appDir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), relativeSubDir);
                            if (!appDir.exists()) appDir.mkdirs();
                            File destFile = new File(appDir, fileName);
                            out = new FileOutputStream(destFile);
                            savedPath = destFile.getAbsolutePath();
                        } catch (Exception appErr) {
                            Log.e(TAG, "App external files dir output failed: " + appErr.getMessage());
                        }
                    }
                }

                if (out == null) {
                    call.reject("Could not create output stream for file: " + fileName);
                    return;
                }

                // 4. Stream chunks directly: Zero-memory RAM buffer
                byte[] buffer = new byte[65536];
                int bytesRead;
                long bytesDownloaded = 0;
                long lastNotifyTime = System.currentTimeMillis();

                while ((bytesRead = in.read(buffer)) > 0) {
                    out.write(buffer, 0, bytesRead);
                    bytesDownloaded += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastNotifyTime > 800) {
                        lastNotifyTime = now;
                        int pct = totalBytes > 0 ? (int) ((bytesDownloaded * 100) / totalBytes) : 0;
                        updateNotification("Downloading " + fileName, (pct > 0 ? pct + "% (" : "(") + (bytesDownloaded / 1048576) + " MB)", pct, true);
                    }
                }

                out.flush();

                if (pendingUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues finishValues = new ContentValues();
                    finishValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    context.getContentResolver().update(pendingUri, finishValues, null, null);
                }

                updateNotification("Audio Download Complete", fileName, 100, false);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fileName", fileName);
                ret.put("size", bytesDownloaded);
                ret.put("path", savedPath);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Direct audio download error: " + e.getMessage(), e);
                call.reject("Direct Download Error: " + e.getMessage());
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
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
                        status = conn.getResponseCode();
                    }
                }

                InputStream is = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
                if (is == null) {
                    try { is = conn.getInputStream(); } catch (Exception ignored) {}
                }
                StringBuilder sb = new StringBuilder();
                if (is != null) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                    reader.close();
                }

                JSObject ret = new JSObject();
                ret.put("success", status >= 200 && status < 400);
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

            String subDir = call.getString("subDir", "");
            String treeUri = call.getString("treeUri", "");

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

                boolean safSaved = false;
                String savedPath = "/storage/emulated/0/Download/GeminiTranslator/" + fileName;

                // 1. Direct SAF Document Tree Overwrite (Custom Novel Folder)
                if (treeUri != null && !treeUri.trim().isEmpty()) {
                    try {
                        Uri parsedTree = Uri.parse(treeUri);
                        String treeDocId = DocumentsContract.getTreeDocumentId(parsedTree);
                        Uri parentDocUri = DocumentsContract.buildDocumentUriUsingTree(parsedTree, treeDocId);
                        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(parsedTree, treeDocId);

                        Uri targetDocUri = null;
                        try (Cursor cursor = context.getContentResolver().query(
                                childrenUri,
                                new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME},
                                null, null, null)) {
                            if (cursor != null) {
                                int idIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                                int nameIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                                while (cursor.moveToNext()) {
                                    String name = cursor.getString(nameIdx);
                                    if (fileName.equalsIgnoreCase(name)) {
                                        String docId = cursor.getString(idIdx);
                                        targetDocUri = DocumentsContract.buildDocumentUriUsingTree(parsedTree, docId);
                                        break;
                                    }
                                }
                            }
                        } catch (Exception queryErr) {
                            Log.w(TAG, "SAF children query warning: " + queryErr.getMessage());
                        }

                        if (targetDocUri == null) {
                            targetDocUri = DocumentsContract.createDocument(context.getContentResolver(), parentDocUri, mimeType, fileName);
                        }

                        if (targetDocUri != null) {
                            try (InputStream in = new java.io.FileInputStream(cacheFile);
                                 OutputStream out = context.getContentResolver().openOutputStream(targetDocUri, "wt")) {
                                byte[] buf = new byte[65536];
                                int len;
                                while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
                                out.flush();
                            }
                            safSaved = true;
                            savedPath = "📁 Overwritten in custom novel folder: " + fileName;
                        }
                    } catch (Exception safErr) {
                        Log.e(TAG, "SAF write failed: " + safErr.getMessage(), safErr);
                    }
                }

                // 2. Relative Subdirectory or Default Downloads (MediaStore API)
                if (!safSaved) {
                    String relativeSubDir = "GeminiTranslator";
                    if (subDir != null && !subDir.trim().isEmpty()) {
                        String clean = subDir.trim().replaceAll("^[\\\\/]+", "").replaceAll("[\\\\/]+$", "");
                        if (!clean.isEmpty()) {
                            if (clean.toLowerCase().startsWith("download/") || clean.toLowerCase().startsWith("downloads/")) {
                                relativeSubDir = clean.replaceFirst("^(?i)downloads?/", "");
                            } else {
                                relativeSubDir = clean;
                            }
                        }
                    }

                    boolean mediaStoreSaved = false;
                    savedPath = "/storage/emulated/0/Download/" + relativeSubDir + "/" + fileName;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + relativeSubDir);
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
                            File pubDownloads = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), relativeSubDir);
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
                }

                final boolean isSaf = safSaved;
                final String finalSub = (subDir != null && !subDir.trim().isEmpty()) ? subDir : "Download/GeminiTranslator";
                new Handler(Looper.getMainLooper()).post(() -> {
                    Toast.makeText(context, " Saved: " + fileName + "\n " + (isSaf ? "Novel Folder" : finalSub), Toast.LENGTH_LONG).show();
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

    // ══════════════════════════════════════════════════════════════════════
    // STORAGE ACCESS FRAMEWORK (SAF) DIRECTORY PICKER
    // ══════════════════════════════════════════════════════════════════════
    @PluginMethod
    public void chooseFolder(PluginCall call) {
        try {
            saveCall(call);
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
            );
            startActivityForResult(call, intent, "folderPickerCallback");
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch folder picker", e);
            call.reject("Could not open folder picker: " + e.getMessage());
        }
    }

    @ActivityCallback
    public void folderPickerCallback(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null && result.getData().getData() != null) {
                Uri treeUri = result.getData().getData();
                Context context = getContext();
                try {
                    int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                    context.getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
                } catch (Exception e) {
                    Log.w(TAG, "takePersistableUriPermission warning: " + e.getMessage());
                }

                String docId = "";
                try {
                    docId = DocumentsContract.getTreeDocumentId(treeUri);
                } catch (Exception ignored) {
                    docId = treeUri.getLastPathSegment();
                }

                String displayPath = "/Selected Folder";
                if (docId != null && !docId.isEmpty()) {
                    if (docId.contains(":")) {
                        displayPath = "/" + docId.substring(docId.indexOf(":") + 1);
                    } else {
                        displayPath = "/" + docId;
                    }
                }

                JSObject ret = new JSObject();
                ret.put("treeUri", treeUri.toString());
                ret.put("displayPath", displayPath);
                call.resolve(ret);
            } else {
                call.reject("Folder selection canceled");
            }
        } catch (Exception e) {
            Log.e(TAG, "folderPickerCallback error: " + e.getMessage(), e);
            call.reject("Folder selection error: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // EMBEDDED LIGHTWEIGHT LOCAL OPDS SERVER (Moon+ Reader Pro Net Library)
    // ══════════════════════════════════════════════════════════════════════
    private static OpdsServer opdsServer = null;

    @PluginMethod
    public void startOpdsServer(PluginCall call) {
        try {
            int port = call.getInt("port", 8080);
            if (opdsServer == null) {
                opdsServer = new OpdsServer(getContext());
            }
            boolean ok = opdsServer.start(port);
            JSObject ret = new JSObject();
            ret.put("running", ok);
            ret.put("port", opdsServer.getPort());
            ret.put("localUrl", "http://127.0.0.1:" + opdsServer.getPort() + "/opds");
            ret.put("wifiUrl", opdsServer.getWifiUrl());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start OPDS server: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopOpdsServer(PluginCall call) {
        try {
            if (opdsServer != null) {
                opdsServer.stop();
            }
            JSObject ret = new JSObject();
            ret.put("running", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error stopping OPDS server: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getOpdsStatus(PluginCall call) {
        try {
            JSObject ret = new JSObject();
            if (opdsServer != null && opdsServer.isRunning()) {
                ret.put("running", true);
                ret.put("port", opdsServer.getPort());
                ret.put("localUrl", "http://127.0.0.1:" + opdsServer.getPort() + "/opds");
                ret.put("wifiUrl", opdsServer.getWifiUrl());
            } else {
                ret.put("running", false);
                ret.put("port", 8080);
                ret.put("localUrl", "http://127.0.0.1:8080/opds");
                ret.put("wifiUrl", "");
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error getting OPDS status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateOpdsCatalog(PluginCall call) {
        try {
            String xml = call.getString("xml", "");
            if (opdsServer == null) {
                opdsServer = new OpdsServer(getContext());
            }
            opdsServer.updateCatalog(xml);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error updating OPDS catalog: " + e.getMessage());
        }
    }

    public static class OpdsServer {
        private ServerSocket serverSocket;
        private int port = 8080;
        private volatile boolean running = false;
        private Thread serverThread;
        private String catalogXml = "";
        private final Context context;

        public OpdsServer(Context context) {
            this.context = context;
        }

        public synchronized boolean start(int requestedPort) {
            if (running && serverSocket != null && !serverSocket.isClosed()) return true;
            this.port = requestedPort;
            try {
                serverSocket = new ServerSocket(this.port);
                serverSocket.setReuseAddress(true);
            } catch (Exception e1) {
                try {
                    this.port = 8085;
                    serverSocket = new ServerSocket(this.port);
                    serverSocket.setReuseAddress(true);
                } catch (Exception e2) {
                    Log.e("OpdsServer", "Cannot bind port 8080 or 8085", e2);
                    return false;
                }
            }
            running = true;
            serverThread = new Thread(this::runServer, "GeminiOpdsThread");
            serverThread.setDaemon(true);
            serverThread.start();
            return true;
        }

        public synchronized void stop() {
            running = false;
            if (serverSocket != null) {
                try { serverSocket.close(); } catch (Exception ignored) {}
                serverSocket = null;
            }
        }

        public boolean isRunning() {
            return running && serverSocket != null && !serverSocket.isClosed();
        }

        public int getPort() { return port; }

        public void updateCatalog(String xml) {
            if (xml != null) this.catalogXml = xml;
        }

        public String getWifiUrl() {
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                while (interfaces.hasMoreElements()) {
                    NetworkInterface iface = interfaces.nextElement();
                    if (iface.isLoopback() || !iface.isUp()) continue;
                    Enumeration<InetAddress> addresses = iface.getInetAddresses();
                    while (addresses.hasMoreElements()) {
                        InetAddress addr = addresses.nextElement();
                        if (addr instanceof java.net.Inet4Address && !addr.isLoopbackAddress()) {
                            String host = addr.getHostAddress();
                            if (host != null && !host.startsWith("127.")) {
                                return "http://" + host + ":" + port + "/opds";
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
            return "";
        }

        private void runServer() {
            while (running && serverSocket != null && !serverSocket.isClosed()) {
                try {
                    Socket socket = serverSocket.accept();
                    new Thread(() -> handleClient(socket)).start();
                } catch (Exception e) {
                    if (!running) break;
                }
            }
        }

        private void handleClient(Socket socket) {
            try (Socket s = socket;
                 InputStream in = socket.getInputStream();
                 OutputStream out = socket.getOutputStream();
                 BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {

                String line = reader.readLine();
                if (line == null || line.trim().isEmpty()) return;

                String[] parts = line.split(" ");
                if (parts.length < 2) return;
                String method = parts[0];
                String path = parts[1];

                while ((line = reader.readLine()) != null && !line.isEmpty()) {}

                if ("GET".equalsIgnoreCase(method)) {
                    if (path.startsWith("/opds") || path.equals("/") || path.startsWith("/catalog")) {
                        String xml = catalogXml;
                        if (xml == null || xml.trim().isEmpty()) {
                            xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
                                  "<feed xmlns=\"http://www.w3.org/2005/Atom\" xmlns:dc=\"http://purl.org/dc/terms/\" xmlns:opds=\"http://opds-spec.org/2010/catalog\">\n" +
                                  "  <id>urn:uuid:gemini-translator-opds</id>\n" +
                                  "  <title>Gemini Translator Library</title>\n" +
                                  "  <updated>" + new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new java.util.Date()) + "</updated>\n" +
                                  "  <author><name>Gemini Translator</name></author>\n" +
                                  "</feed>";
                        }
                        byte[] bytes = xml.getBytes(StandardCharsets.UTF_8);
                        String header = "HTTP/1.1 200 OK\r\n" +
                                        "Content-Type: application/atom+xml;profile=opds-catalog;kind=acquisition;charset=utf-8\r\n" +
                                        "Access-Control-Allow-Origin: *\r\n" +
                                        "Content-Length: " + bytes.length + "\r\n" +
                                        "Connection: close\r\n\r\n";
                        out.write(header.getBytes(StandardCharsets.UTF_8));
                        out.write(bytes);
                        out.flush();
                    } else if (path.startsWith("/download/") || path.startsWith("/opds/download/")) {
                        String fileName = Uri.decode(path.substring(path.lastIndexOf('/') + 1));
                        File file = new File(context.getCacheDir(), fileName);
                        if (!file.exists()) {
                            File pubFile = new File(new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "GeminiTranslator"), fileName);
                            if (pubFile.exists()) file = pubFile;
                        }
                        if (file.exists()) {
                            long len = file.length();
                            String header = "HTTP/1.1 200 OK\r\n" +
                                            "Content-Type: application/epub+zip\r\n" +
                                            "Content-Disposition: attachment; filename=\"" + fileName + "\"\r\n" +
                                            "Access-Control-Allow-Origin: *\r\n" +
                                            "Content-Length: " + len + "\r\n" +
                                            "Connection: close\r\n\r\n";
                            out.write(header.getBytes(StandardCharsets.UTF_8));
                            try (InputStream fis = new java.io.FileInputStream(file)) {
                                byte[] buf = new byte[65536];
                                int r;
                                while ((r = fis.read(buf)) > 0) out.write(buf, 0, r);
                            }
                            out.flush();
                        } else {
                            String notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                            out.write(notFound.getBytes(StandardCharsets.UTF_8));
                            out.flush();
                        }
                    } else {
                        String ok = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 17\r\nConnection: close\r\n\r\nGemini Translator";
                        out.write(ok.getBytes(StandardCharsets.UTF_8));
                        out.flush();
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            if (audioActionReceiver != null && getContext() != null) {
                getContext().unregisterReceiver(audioActionReceiver);
                audioActionReceiver = null;
            }
        } catch (Exception ignored) {}
        try {
            if (mediaSession != null) {
                mediaSession.setActive(false);
                mediaSession.release();
                mediaSession = null;
            }
        } catch (Exception ignored) {}
        if (cachedCoverBitmap != null && !cachedCoverBitmap.isRecycled()) {
            try {
                cachedCoverBitmap.recycle();
            } catch (Exception ignored) {}
            cachedCoverBitmap = null;
        }
        releaseAudioWakeLock();
    }
}
