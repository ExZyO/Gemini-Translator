package com.exzyo.geminitranslator;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;

import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class NativeAudioService extends Service {
    private static final String TAG = "NativeAudioService";

    public static final String ACTION_PLAY_TRACK = "com.exzyo.geminitranslator.PLAY_TRACK";
    public static final String ACTION_PAUSE = "com.exzyo.geminitranslator.PAUSE";
    public static final String ACTION_RESUME = "com.exzyo.geminitranslator.RESUME";
    public static final String ACTION_TOGGLE_PLAY = "com.exzyo.geminitranslator.TOGGLE_PLAY";
    public static final String ACTION_SEEK_TO = "com.exzyo.geminitranslator.SEEK_TO";
    public static final String ACTION_REWIND_5 = "com.exzyo.geminitranslator.REWIND_5";
    public static final String ACTION_FORWARD_5 = "com.exzyo.geminitranslator.FORWARD_5";
    public static final String ACTION_NEXT_TRACK = "com.exzyo.geminitranslator.NEXT_TRACK";
    public static final String ACTION_PREV_TRACK = "com.exzyo.geminitranslator.PREV_TRACK";
    public static final String ACTION_SET_SPEED = "com.exzyo.geminitranslator.SET_SPEED";
    public static final String ACTION_SET_MODE = "com.exzyo.geminitranslator.SET_MODE";
    public static final String ACTION_STOP_SERVICE = "com.exzyo.geminitranslator.STOP_SERVICE";

    public static final String CHANNEL_ID_NATIVE_AUDIO = "gemini_native_audio_playback";
    public static final int NOTIFICATION_ID = 9555;

    public static final int MODE_CONTINUOUS = 0;
    public static final int MODE_REPEAT_CHAPTER = 1;
    public static final int MODE_PAUSE_AT_END = 2;

    private static NativeAudioService sInstance = null;

    public interface AudioEventListener {
        void onPlaybackStateChanged(boolean isPlaying, long positionMs, long durationMs, int trackIndex, boolean isBuffering);
        void onTrackEnded(int trackIndex);
        void onNextRequested();
        void onPreviousRequested();
    }

    private static AudioEventListener sEventListener = null;

    public static void setEventListener(AudioEventListener listener) {
        sEventListener = listener;
    }

    public static NativeAudioService getInstance() {
        return sInstance;
    }

    private ExoPlayer mPlayer;
    private MediaSession mMediaSession;
    private PowerManager.WakeLock mWakeLock;
    private final Handler mHandler = new Handler(Looper.getMainLooper());

    private String mCurrentUrl = "";
    private String mCurrentTitle = "Audiobook";
    private String mCurrentBookTitle = "";
    private String mCurrentAuthor = "";
    private String mCurrentCoverUrl = "";
    private Bitmap mCachedCoverBitmap = null;
    private int mCurrentTrackIndex = 0;
    private int mTotalTracks = 1;
    private float mPlaybackSpeed = 1.0f;
    private int mPlaybackMode = MODE_CONTINUOUS;

    private boolean mIsForeground = false;
    private BroadcastReceiver mLocalReceiver = null;

    private AudioManager mAudioManager;
    private AudioFocusRequest mAudioFocusRequest;
    private boolean mResumeOnFocusGain = false;

    private final Runnable mProgressUpdateRunnable = new Runnable() {
        @Override
        public void run() {
            if (mPlayer != null && mPlayer.isPlaying()) {
                notifyStateChanged();
                mHandler.postDelayed(this, 500);
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
        createNotificationChannel();
        initWakeLock();
        initAudioManager();
        initExoPlayer();
        initMediaSession();
        registerActionReceiver();
    }

    private void initWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            mWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GeminiTranslator::NativeAudioLock");
            mWakeLock.setReferenceCounted(false);
        }
    }

    private void acquireWakeLock() {
        if (mWakeLock != null && !mWakeLock.isHeld()) {
            try {
                mWakeLock.acquire(8 * 60 * 60 * 1000L); // 8-hour max safety ceiling
            } catch (Exception e) {
                Log.w(TAG, "WakeLock acquire error: " + e.getMessage());
            }
        }
    }

    private void releaseWakeLock() {
        if (mWakeLock != null && mWakeLock.isHeld()) {
            try {
                mWakeLock.release();
            } catch (Exception ignored) {}
        }
    }

    private void initAudioManager() {
        mAudioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    }

    private synchronized boolean requestNativeAudioFocus() {
        if (mAudioManager == null) return true;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                android.media.AudioAttributes playbackAttributes = new android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                mAudioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(mAudioFocusChangeListener, mHandler)
                        .build();
                int res = mAudioManager.requestAudioFocus(mAudioFocusRequest);
                return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            } else {
                int res = mAudioManager.requestAudioFocus(mAudioFocusChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
                return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            }
        } catch (Exception e) {
            Log.w(TAG, "requestNativeAudioFocus error: " + e.getMessage());
            return true;
        }
    }

    private synchronized void abandonNativeAudioFocus() {
        if (mAudioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && mAudioFocusRequest != null) {
                mAudioManager.abandonAudioFocusRequest(mAudioFocusRequest);
            } else {
                mAudioManager.abandonAudioFocus(mAudioFocusChangeListener);
            }
        } catch (Exception ignored) {}
    }

    private final AudioManager.OnAudioFocusChangeListener mAudioFocusChangeListener = new AudioManager.OnAudioFocusChangeListener() {
        @Override
        public void onAudioFocusChange(int focusChange) {
            switch (focusChange) {
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    // Temporary loss: phone call, navigation, or Gemini AI
                    if (mPlayer != null && mPlayer.isPlaying()) {
                        mResumeOnFocusGain = true;
                        mPlayer.pause();
                    }
                    break;
                case AudioManager.AUDIOFOCUS_LOSS:
                    // Permanent loss: another media app (TikTok, YouTube, etc.) started
                    mResumeOnFocusGain = false;
                    if (mPlayer != null) {
                        mPlayer.pause();
                    }
                    break;
                case AudioManager.AUDIOFOCUS_GAIN:
                    // Regained focus after temporary loss (e.g. Gemini AI closed or call ended)
                    if (mResumeOnFocusGain) {
                        mResumeOnFocusGain = false;
                        if (mPlayer != null) {
                            mPlayer.play();
                        }
                    }
                    break;
            }
            updateNotificationAndSession();
            notifyStateChanged();
        }
    };

    private void initExoPlayer() {
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                .setUsage(C.USAGE_MEDIA)
                .build();

        mPlayer = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, false) // Managed directly via mAudioFocusChangeListener
                .setHandleAudioBecomingNoisy(true) // pause when headphones unplugged
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build();

        mPlayer.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    handleTrackEnded();
                }
                updateNotificationAndSession();
                notifyStateChanged();
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (isPlaying) {
                    acquireWakeLock();
                    mHandler.removeCallbacks(mProgressUpdateRunnable);
                    mHandler.post(mProgressUpdateRunnable);
                } else {
                    releaseWakeLock();
                    mHandler.removeCallbacks(mProgressUpdateRunnable);
                }
                updateNotificationAndSession();
                notifyStateChanged();
            }
        });
    }

    private void initMediaSession() {
        mMediaSession = new MediaSession(this, "GeminiNativeAudioSession");
        mMediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);

        mMediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                resume();
            }

            @Override
            public void onPause() {
                pause();
            }

            @Override
            public void onSkipToNext() {
                skipToNext();
            }

            @Override
            public void onSkipToPrevious() {
                skipToPrevious();
            }

            @Override
            public void onFastForward() {
                skipForward5();
            }

            @Override
            public void onRewind() {
                skipBackward5();
            }

            @Override
            public void onSeekTo(long pos) {
                seekTo(pos);
            }

            @Override
            public void onStop() {
                pause();
            }

            @Override
            public void onCustomAction(String action, android.os.Bundle extras) {
                if (ACTION_REWIND_5.equals(action)) {
                    skipBackward5();
                } else if (ACTION_FORWARD_5.equals(action)) {
                    skipForward5();
                }
            }
        });

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setAction("ACTION_OPEN_AUDIO_PLAYER");
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, flags);
        mMediaSession.setSessionActivity(contentPendingIntent);
        mMediaSession.setActive(true);
    }

    private void registerActionReceiver() {
        mLocalReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                String action = intent.getAction();
                if (action == null) return;

                switch (action) {
                    case ACTION_TOGGLE_PLAY:
                        togglePlay();
                        break;
                    case ACTION_PAUSE:
                        pause();
                        break;
                    case ACTION_RESUME:
                        resume();
                        break;
                    case ACTION_REWIND_5:
                        skipBackward5();
                        break;
                    case ACTION_FORWARD_5:
                        skipForward5();
                        break;
                    case ACTION_NEXT_TRACK:
                        skipToNext();
                        break;
                    case ACTION_PREV_TRACK:
                        skipToPrevious();
                        break;
                    case ACTION_STOP_SERVICE:
                        stopPlaybackAndService();
                        break;
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_TOGGLE_PLAY);
        filter.addAction(ACTION_PAUSE);
        filter.addAction(ACTION_RESUME);
        filter.addAction(ACTION_REWIND_5);
        filter.addAction(ACTION_FORWARD_5);
        filter.addAction(ACTION_NEXT_TRACK);
        filter.addAction(ACTION_PREV_TRACK);
        filter.addAction(ACTION_STOP_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(mLocalReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(mLocalReceiver, filter);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_PLAY_TRACK.equals(action)) {
                String src = intent.getStringExtra("src");
                String title = intent.getStringExtra("title");
                String bookTitle = intent.getStringExtra("bookTitle");
                String author = intent.getStringExtra("author");
                String cover = intent.getStringExtra("cover");
                int trackIdx = intent.getIntExtra("trackIndex", 0);
                int totalTracks = intent.getIntExtra("totalTracks", 1);
                long posMs = intent.getLongExtra("positionMs", 0L);
                float speed = intent.getFloatExtra("speed", mPlaybackSpeed);
                int mode = intent.getIntExtra("mode", mPlaybackMode);

                playTrack(src, title, bookTitle, author, cover, trackIdx, totalTracks, posMs, speed, mode);
            } else if (ACTION_PAUSE.equals(action)) {
                pause();
            } else if (ACTION_RESUME.equals(action)) {
                resume();
            } else if (ACTION_TOGGLE_PLAY.equals(action)) {
                togglePlay();
            } else if (ACTION_SEEK_TO.equals(action)) {
                long pos = intent.getLongExtra("positionMs", 0L);
                seekTo(pos);
            } else if (ACTION_REWIND_5.equals(action)) {
                skipBackward5();
            } else if (ACTION_FORWARD_5.equals(action)) {
                skipForward5();
            } else if (ACTION_SET_SPEED.equals(action)) {
                float speed = intent.getFloatExtra("speed", 1.0f);
                setPlaybackSpeed(speed);
            } else if (ACTION_SET_MODE.equals(action)) {
                int mode = intent.getIntExtra("mode", MODE_CONTINUOUS);
                setPlaybackMode(mode);
            } else if (ACTION_STOP_SERVICE.equals(action)) {
                stopPlaybackAndService();
            }
        }
        return START_STICKY;
    }

    public synchronized void playTrack(String src, String title, String bookTitle, String author, String cover,
                                       int trackIndex, int totalTracks, long positionMs, float speed, int mode) {
        if (src == null || src.trim().isEmpty()) return;
        mCurrentUrl = src.trim();
        mCurrentTitle = title != null && !title.isEmpty() ? title : "Chapter " + (trackIndex + 1);
        mCurrentBookTitle = bookTitle != null ? bookTitle : "";
        mCurrentAuthor = author != null ? author : "";
        mCurrentTrackIndex = trackIndex;
        mTotalTracks = Math.max(1, totalTracks);
        mPlaybackSpeed = speed > 0 ? speed : 1.0f;
        mPlaybackMode = mode;

        if (cover != null && !cover.equals(mCurrentCoverUrl)) {
            mCurrentCoverUrl = cover;
            fetchCoverBitmapAsync(cover);
        }

        try {
            MediaItem mediaItem;
            if (mCurrentUrl.startsWith("file://") || mCurrentUrl.startsWith("/")) {
                String cleanPath = mCurrentUrl.startsWith("file://") ? mCurrentUrl.substring(7) : mCurrentUrl;
                mediaItem = MediaItem.fromUri(Uri.fromFile(new File(cleanPath)));
            } else {
                mediaItem = MediaItem.fromUri(Uri.parse(mCurrentUrl));
            }

            mPlayer.setMediaItem(mediaItem);
            mPlayer.setPlaybackParameters(new PlaybackParameters(mPlaybackSpeed));
            mPlayer.prepare();
            if (positionMs > 0) {
                mPlayer.seekTo(positionMs);
            }
            requestNativeAudioFocus();
            mPlayer.play();

            updateNotificationAndSession();
            startForegroundNotification();
        } catch (Exception e) {
            Log.e(TAG, "playTrack error: " + e.getMessage(), e);
        }
    }

    public void pause() {
        if (mPlayer != null) {
            mPlayer.pause();
        }
    }

    public void resume() {
        mResumeOnFocusGain = false;
        requestNativeAudioFocus();
        if (mPlayer != null) {
            mPlayer.play();
        }
    }

    public void togglePlay() {
        if (mPlayer == null) return;
        if (mPlayer.isPlaying()) {
            pause();
        } else {
            resume();
        }
    }

    public void seekTo(long positionMs) {
        if (mPlayer != null) {
            mPlayer.seekTo(Math.max(0, positionMs));
            notifyStateChanged();
        }
    }

    public void skipBackward5() {
        if (mPlayer != null) {
            long target = Math.max(0, mPlayer.getCurrentPosition() - 5000L);
            seekTo(target);
        }
    }

    public void skipForward5() {
        if (mPlayer != null) {
            long dur = mPlayer.getDuration();
            long target = mPlayer.getCurrentPosition() + 5000L;
            if (dur > 0) target = Math.min(target, dur);
            seekTo(target);
        }
    }

    public void skipToNext() {
        if (sEventListener != null) {
            sEventListener.onNextRequested();
        }
    }

    public void skipToPrevious() {
        if (mPlayer != null && mPlayer.getCurrentPosition() > 3000L) {
            seekTo(0);
        } else if (sEventListener != null) {
            sEventListener.onPreviousRequested();
        }
    }

    public void setPlaybackSpeed(float speed) {
        if (speed <= 0) return;
        mPlaybackSpeed = speed;
        if (mPlayer != null) {
            mPlayer.setPlaybackParameters(new PlaybackParameters(speed));
        }
    }

    public void setPlaybackMode(int mode) {
        mPlaybackMode = mode;
    }

    private void handleTrackEnded() {
        if (mPlaybackMode == MODE_REPEAT_CHAPTER) {
            seekTo(0);
            resume();
        } else if (mPlaybackMode == MODE_PAUSE_AT_END) {
            pause();
            seekTo(0);
        } else {
            // MODE_CONTINUOUS
            if (sEventListener != null) {
                sEventListener.onTrackEnded(mCurrentTrackIndex);
            }
        }
    }

    private void notifyStateChanged() {
        if (sEventListener != null && mPlayer != null) {
            boolean isPlaying = mPlayer.isPlaying();
            long pos = mPlayer.getCurrentPosition();
            long dur = mPlayer.getDuration();
            boolean isBuffering = mPlayer.getPlaybackState() == Player.STATE_BUFFERING;
            sEventListener.onPlaybackStateChanged(isPlaying, pos, dur, mCurrentTrackIndex, isBuffering);
        }
    }

    private void startForegroundNotification() {
        Notification notification = buildNotification();
        if (notification == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            mIsForeground = true;
        } catch (Exception e) {
            Log.e(TAG, "startForeground error: " + e.getMessage(), e);
        }
    }

    private void updateNotificationAndSession() {
        updateMediaSessionPlayback();
        updateMediaSessionMetadata();

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            Notification n = buildNotification();
            if (n != null) {
                nm.notify(NOTIFICATION_ID, n);
            }
        }
    }

    private void updateMediaSessionPlayback() {
        if (mMediaSession == null || mPlayer == null) return;
        try {
            boolean isPlaying = mPlayer.isPlaying();
            long pos = mPlayer.getCurrentPosition();
            int state = isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
            long actions = PlaybackState.ACTION_PLAY
                    | PlaybackState.ACTION_PAUSE
                    | PlaybackState.ACTION_PLAY_PAUSE
                    | PlaybackState.ACTION_SKIP_TO_NEXT
                    | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                    | PlaybackState.ACTION_FAST_FORWARD
                    | PlaybackState.ACTION_REWIND
                    | PlaybackState.ACTION_SEEK_TO;

            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                    .setActions(actions)
                    .setState(state, pos, mPlaybackSpeed, SystemClock.elapsedRealtime());

            // Add Custom Actions for Samsung One UI 6 / Android 13+ Lockscreen Media Controls
            PlaybackState.CustomAction rewindAction = new PlaybackState.CustomAction.Builder(
                    ACTION_REWIND_5,
                    "-5s",
                    android.R.drawable.ic_media_rew
            ).build();
            PlaybackState.CustomAction forwardAction = new PlaybackState.CustomAction.Builder(
                    ACTION_FORWARD_5,
                    "+5s",
                    android.R.drawable.ic_media_ff
            ).build();

            stateBuilder.addCustomAction(rewindAction);
            stateBuilder.addCustomAction(forwardAction);

            mMediaSession.setPlaybackState(stateBuilder.build());
        } catch (Exception e) {
            Log.w(TAG, "updateMediaSessionPlayback error: " + e.getMessage());
        }
    }

    private void updateMediaSessionMetadata() {
        if (mMediaSession == null || mPlayer == null) return;
        try {
            long dur = mPlayer.getDuration();
            String artist = (mCurrentAuthor != null && !mCurrentAuthor.isEmpty()) ? mCurrentAuthor : mCurrentBookTitle;

            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, mCurrentTitle)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, mCurrentBookTitle)
                    .putLong(MediaMetadata.METADATA_KEY_DURATION, dur > 0 ? dur : -1L);

            if (mCachedCoverBitmap != null && !mCachedCoverBitmap.isRecycled()) {
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, mCachedCoverBitmap);
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, mCachedCoverBitmap);
            }
            mMediaSession.setMetadata(metaBuilder.build());
        } catch (Exception e) {
            Log.w(TAG, "updateMediaSessionMetadata error: " + e.getMessage());
        }
    }

    private Notification buildNotification() {
        Context context = this;
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setAction("ACTION_OPEN_AUDIO_PLAYER");
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, flags);

        // Use PendingIntent.getService so Android 14 SystemUI never drops actions due to RECEIVER_NOT_EXPORTED
        Intent prevIntent = new Intent(context, NativeAudioService.class);
        prevIntent.setAction(ACTION_PREV_TRACK);
        PendingIntent prevPending = PendingIntent.getService(context, 201, prevIntent, flags);

        Intent rewIntent = new Intent(context, NativeAudioService.class);
        rewIntent.setAction(ACTION_REWIND_5);
        PendingIntent rewPending = PendingIntent.getService(context, 202, rewIntent, flags);

        Intent playPauseIntent = new Intent(context, NativeAudioService.class);
        playPauseIntent.setAction(ACTION_TOGGLE_PLAY);
        PendingIntent playPausePending = PendingIntent.getService(context, 203, playPauseIntent, flags);

        Intent fwdIntent = new Intent(context, NativeAudioService.class);
        fwdIntent.setAction(ACTION_FORWARD_5);
        PendingIntent fwdPending = PendingIntent.getService(context, 204, fwdIntent, flags);

        Intent nextIntent = new Intent(context, NativeAudioService.class);
        nextIntent.setAction(ACTION_NEXT_TRACK);
        PendingIntent nextPending = PendingIntent.getService(context, 205, nextIntent, flags);

        boolean isPlaying = mPlayer != null && mPlayer.isPlaying();
        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseText = isPlaying ? "Pause" : "Play";

        String subText = (mCurrentBookTitle != null && !mCurrentBookTitle.isEmpty()) ? mCurrentBookTitle : "Audiobook";

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(context, CHANNEL_ID_NATIVE_AUDIO);
        } else {
            builder = new Notification.Builder(context);
        }

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle();
        if (mMediaSession != null) {
            mediaStyle.setMediaSession(mMediaSession.getSessionToken());
        }
        mediaStyle.setShowActionsInCompactView(1, 2, 3);

        builder.setStyle(mediaStyle)
                .setContentTitle(mCurrentTitle)
                .setContentText(subText)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentPendingIntent)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setPriority(Notification.PRIORITY_LOW)
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true);

        if (mCachedCoverBitmap != null && !mCachedCoverBitmap.isRecycled()) {
            builder.setLargeIcon(mCachedCoverBitmap);
        }

        // 5-Button Native MediaStyle Layout (Strictly NO EMOJIS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            builder.addAction(new Notification.Action.Builder(
                    android.graphics.drawable.Icon.createWithResource(context, android.R.drawable.ic_media_previous),
                    "Previous", prevPending).build());
            builder.addAction(new Notification.Action.Builder(
                    android.graphics.drawable.Icon.createWithResource(context, android.R.drawable.ic_media_rew),
                    "-5s", rewPending).build());
            builder.addAction(new Notification.Action.Builder(
                    android.graphics.drawable.Icon.createWithResource(context, playPauseIcon),
                    playPauseText, playPausePending).build());
            builder.addAction(new Notification.Action.Builder(
                    android.graphics.drawable.Icon.createWithResource(context, android.R.drawable.ic_media_ff),
                    "+5s", fwdPending).build());
            builder.addAction(new Notification.Action.Builder(
                    android.graphics.drawable.Icon.createWithResource(context, android.R.drawable.ic_media_next),
                    "Next", nextPending).build());
        } else {
            builder.addAction(android.R.drawable.ic_media_previous, "Previous", prevPending);
            builder.addAction(android.R.drawable.ic_media_rew, "-5s", rewPending);
            builder.addAction(playPauseIcon, playPauseText, playPausePending);
            builder.addAction(android.R.drawable.ic_media_ff, "+5s", fwdPending);
            builder.addAction(android.R.drawable.ic_media_next, "Next", nextPending);
        }

        return builder.build();
    }

    private void fetchCoverBitmapAsync(final String coverUrl) {
        if (coverUrl == null || coverUrl.trim().isEmpty()) {
            mCachedCoverBitmap = null;
            return;
        }
        final String cleanUrl = coverUrl.trim();

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
                    mCachedCoverBitmap = decoded;
                    mHandler.post(this::updateNotificationAndSession);
                }
            } catch (Exception e) {
                Log.w(TAG, "fetchCoverBitmapAsync error: " + e.getMessage());
            }
        }).start();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID_NATIVE_AUDIO,
                        "Native Audiobook Player",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Provides continuous background audio playback and lock screen media controls");
                channel.setSound(null, null);
                channel.enableVibration(false);
                nm.createNotificationChannel(channel);
            }
        }
    }

    public void stopPlaybackAndService() {
        if (mPlayer != null) {
            try {
                mPlayer.stop();
                mPlayer.release();
            } catch (Exception ignored) {}
            mPlayer = null;
        }
        if (mMediaSession != null) {
            try {
                mMediaSession.setActive(false);
                mMediaSession.release();
            } catch (Exception ignored) {}
            mMediaSession = null;
        }
        abandonNativeAudioFocus();
        releaseWakeLock();
        mHandler.removeCallbacks(mProgressUpdateRunnable);
        stopForeground(true);
        stopSelf();
        sInstance = null;
    }

    @Override
    public void onDestroy() {
        if (mLocalReceiver != null) {
            try { unregisterReceiver(mLocalReceiver); } catch (Exception ignored) {}
        }
        stopPlaybackAndService();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return new LocalBinder();
    }

    public class LocalBinder extends Binder {
        public NativeAudioService getService() {
            return NativeAudioService.this;
        }
    }
}
