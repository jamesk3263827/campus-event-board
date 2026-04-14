// server/services/javaService.js
const axios = require('axios');

const JAVA_BASE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8080';

// Shared axios instance with timeout
const javaClient = axios.create({
  baseURL: JAVA_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Friendly error extractor for Java service responses.
 */
function extractError(error, fallback) {
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return 'Java waitlist service is not running. Start it with: cd waitlist-service && ./mvnw spring-boot:run';
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return 'Java waitlist service timed out. It may still be starting up — try again in a moment.';
  }
  if (error.response) {
    return error.response.data?.message || error.response.data?.error || fallback;
  }
  return fallback;
}

/**
 * Forward an RSVP request to the Java microservice.
 * Java decides "going" vs "waitlisted" based on event capacity.
 */
async function rsvpToEvent(userId, eventId) {
  try {
    const response = await javaClient.post('/waitlist/rsvp', { userId, eventId });
    return response.data;
  } catch (error) {
    throw new Error(extractError(error, 'RSVP failed. Please try again.'));
  }
}

/**
 * Forward a cancel request to the Java microservice.
 * Java automatically promotes the next waitlisted user.
 */
async function cancelRsvp(userId, eventId) {
  try {
    const response = await javaClient.delete('/waitlist/cancel', {
      params: { userId, eventId },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractError(error, 'Cancel failed. Please try again.'));
  }
}

/**
 * Check whether the Java service is reachable.
 * Used by the /health route for diagnostics.
 */
async function checkJavaHealth() {
  // Try our lightweight custom endpoint first, fall back to Spring Actuator
  for (const path of ['/waitlist/health', '/actuator/health']) {
    try {
      const response = await javaClient.get(path, { timeout: 3000 });
      return { reachable: true, status: response.data?.status || 'UP' };
    } catch {
      // try next path
    }
  }
  return { reachable: false };
}

/**
 * Called when an event's capacity is increased.
 * Tells Java to promote up to `spotsOpened` waitlisted users into "going".
 */
async function fillCapacity(eventId, spotsOpened) {
  try {
    const response = await javaClient.post('/waitlist/fill-capacity', {
      eventId,
      spotsOpened,
    });
    return response.data;
  } catch (error) {
    throw new Error(extractError(error, 'Fill-capacity promotion failed.'));
  }
}

module.exports = { rsvpToEvent, cancelRsvp, checkJavaHealth, fillCapacity };
