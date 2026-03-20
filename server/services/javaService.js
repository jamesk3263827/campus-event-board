// services/javaService.js
const axios = require('axios');

const JAVA_BASE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8080';

/**
 * Forward an RSVP request to the Java microservice.
 * @param {string} userId
 * @param {string} eventId
 * @returns {Promise<{ status: string, message: string, userId: string, eventId: string }>}
 */
async function rsvpToEvent(userId, eventId) {
  try {
    const response = await axios.post(`${JAVA_BASE_URL}/waitlist/rsvp`, {
      userId,
      eventId,
    });
    return response.data;
  } catch (error) {
    // Unwrap axios error so callers get a clean message
    if (error.response) {
      // Java returned a 4xx/5xx
      throw new Error(error.response.data?.message || 'RSVP failed');
    }
    throw new Error('Java service unreachable');
  }
}

/**
 * Forward a cancel request to the Java microservice.
 * @param {string} userId
 * @param {string} eventId
 * @returns {Promise<{ status: string, message: string }>}
 */
async function cancelRsvp(userId, eventId) {
  try {
    const response = await axios.delete(`${JAVA_BASE_URL}/waitlist/cancel`, {
      params: { userId, eventId },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || 'Cancel failed');
    }
    throw new Error('Java service unreachable');
  }
}

module.exports = { rsvpToEvent, cancelRsvp };