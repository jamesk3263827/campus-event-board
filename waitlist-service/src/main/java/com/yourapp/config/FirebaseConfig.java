package com.yourapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    static {
        System.err.println("FIREBASE_INIT: FirebaseConfig class loaded");
    }

    @PostConstruct
    public void initialize() throws IOException {
        System.err.println("FIREBASE_INIT: initialize() called");

        if (FirebaseApp.getApps().isEmpty()) {
            System.err.println("FIREBASE_INIT: loading serviceAccountKey.json...");

            InputStream serviceAccount =
                getClass().getClassLoader().getResourceAsStream("serviceAccountKey.json");

            if (serviceAccount == null) {
                throw new IllegalStateException("serviceAccountKey.json not found in classpath");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            FirebaseApp.initializeApp(options);
            System.err.println("FIREBASE_INIT: Firebase initialized successfully!");
        }
    }
}