package com.yourapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    // Production: full JSON string injected via Render environment variable.
    // Spring reads this from the FIREBASE_SERVICE_ACCOUNT_JSON env var.
    // The colon at the end means "default to empty string if not set".
    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String firebaseJsonEnv;

    // Local dev fallback: absolute file path set in server/.env or terminal export.
    @Value("${firebase.key-path:}")
    private String keyPath;

    static {
        System.err.println("FIREBASE_INIT: FirebaseConfig class loaded");
    }

    @PostConstruct
    public void initialize() throws IOException {
        System.err.println("FIREBASE_INIT: initialize() called");

        if (FirebaseApp.getApps().isEmpty()) {
            InputStream serviceAccount;

            if (firebaseJsonEnv != null && !firebaseJsonEnv.isBlank()) {
                // Production path: JSON string from environment variable
                System.err.println("FIREBASE_INIT: loading credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var");
                serviceAccount = new ByteArrayInputStream(
                    firebaseJsonEnv.getBytes(StandardCharsets.UTF_8));

            } else if (keyPath != null && !keyPath.isBlank()) {
                // Local dev path: file path from application.properties / FIREBASE_KEY_PATH env var
                System.err.println("FIREBASE_INIT: loading key from file path: " + keyPath);
                serviceAccount = new FileInputStream(keyPath);

            } else {
                // Last-resort fallback: serviceAccountKey.json on the classpath (original behaviour)
                System.err.println("FIREBASE_INIT: loading serviceAccountKey.json from classpath");
                serviceAccount = getClass().getClassLoader()
                    .getResourceAsStream("serviceAccountKey.json");

                if (serviceAccount == null) {
                    throw new IllegalStateException(
                        "No Firebase credentials found. " +
                        "Set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable " +
                        "or place serviceAccountKey.json in the classpath.");
                }
            }

            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            FirebaseApp.initializeApp(options);
            System.err.println("FIREBASE_INIT: Firebase initialized successfully!");
        }
    }
}
