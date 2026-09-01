package com.exzyo.geminitranslator;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAndroidBridgePlugin.class);
        registerPlugin(NativeEpubMergerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
