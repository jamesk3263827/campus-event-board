# ── Build stage ───────────────────────────────────────────────────────────────
# Uses the full JDK to compile and package the Spring Boot app with Maven.
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Copy the Maven wrapper and pom.xml first so dependency downloads are cached
# separately from source changes — speeds up rebuilds significantly.
COPY mvnw mvnw.cmd* pom.xml .mvn* ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy source and build the fat JAR. -DskipTests avoids running unit tests
# during the Docker build (run them separately in CI).
COPY src/ src/
RUN ./mvnw clean package -DskipTests -q

# ── Run stage ─────────────────────────────────────────────────────────────────
# Uses only the JRE — smaller final image (~200 MB vs ~400 MB with full JDK).
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy only the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Install curl so the docker-compose healthcheck can call /actuator/health
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
