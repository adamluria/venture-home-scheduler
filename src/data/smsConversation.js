/**
 * Two-Way SMS Conversation Service
 *
 * Handles inbound SMS from customers via Twilio webhook.
 * Parses intent (confirm, cancel, reschedule, running late) and updates appointment.
 * Maintains conversation log on each appointment.
 *
 * Setup:
 *   1. In Twilio console, set your phone number's webhook to:
 *      POST https://your-url/api/sms/inbound
 *   2. Set TWILIO_PHONE_NUMBER env var
 */

// ─── Intent Parser ──────────────────────────────────────────────────

const INTENTS = {
  confirm:    { keywords: ['confirm', 'yes', 'yep', 'yeah', 'ok', 'sure', 'sounds good', 'see you', 'will be there', 'coming', 'on my way'], action: 'confirm' },
  cancel:     { keywords: ['cancel', 'cant make it', "can't make it", 'not coming', 'need to cancel', 'something came up', 'have to cancel'], action: 'cancel' },
  reschedule: { keywords: ['reschedule', 'move', 'change time', 'different time', 'another day', 'change date', 'push back', 'rain check'], action: 'reschedule' },
  late:       { keywords: ['running late', 'gonna be late', 'few minutes late', 'be there soon', 'on the way', 'stuck in traffic', 'delayed'], action: 'late' },
  question:   { keywords: ['where', 'address', 'what time', 'how long', 'who', 'directions', 'parking', '?'], action: 'question' },
};

/**
 * Parse the customer's SMS to determine intent.
 * @param {string} body - The SMS message text
 * @returns {{ intent: string, confidence: number, action: string }}
 */
export function parseIntent(body) {
  const normalized = body.toLowerCase().trim();

  let bestMatch = { intent: 'unknown', confidence: 0, action: 'unknown' };

  for (const [intent, config] of Object.entries(INTENTS)) {
    for (const keyword of config.keywords) {
      if (normalized.includes(keyword)) {
        const confidence = keyword.length / normalized.length; // longer match = higher confidence
        if (confidence > bestMatch.confidence || (confidence === bestMatch.confidence && keyword.length > 3)) {
          bestMatch = { intent, confidence: Math.min(1, confidence + 0.3), action: config.action };
        }
      }
    }
  }

  // If message is very short (1-3 words) and matches, high confidence
  if (normalized.split(/\s+/).length <= 3 && bestMatch.intent !== 'unknown') {
    bestMatch.confidence = Math.min(1, bestMatch.confidence + 0.3);
  }

  return bestMatch;
}

/**
 * Generate an auto-reply based on the parsed intent.
 * @param {string} action - The parsed action
 * @param {Object} appointment - The appointment details
 * @returns {string} The reply SMS text
 */
export function generateReply(action, appointment) {
  const repName = appointment.repName || 'your consultant';
  const dateStr = appointment.dateDisplay || appointment.date;
  const time = appointment.time;

  switch (action) {
    case 'confirm':
      return `Great, you're confirmed for ${dateStr} at ${time}! ${repName} looks forward to meeting you. Reply CANCEL if plans change.`;

    case 'cancel':
      return `We've canceled your appointment for ${dateStr} at ${time}. Would you like to reschedule? Reply RESCHEDULE or call us.`;

    case 'reschedule':
      return `No problem! To reschedule, visit: ${appointment.rescheduleUrl || 'your-url/#/reschedule/' + appointment.id}\nOr reply with your preferred date/time.`;

    case 'late':
      return `Thanks for the heads up! ${repName} will wait for you. See you soon!`;

    case 'question':
      return `Your appointment is ${dateStr} at ${time} with ${repName}. Location: ${appointment.address || 'to be confirmed'}. Need anything else? Reply or call us.`;

    default:
      return `Thanks for your message! Your appointment is ${dateStr} at ${time}. Reply CONFIRM, CANCEL, or RESCHEDULE. For anything else, we'll have someone reach out.`;
  }
}

// ─── Conversation Log ───────────────────────────────────────────────

// In-memory conversation store (in production, use a database)
const conversations = {};

export function getConversation(appointmentId) {
  return conversations[appointmentId] || [];
}

export function addMessage(appointmentId, message) {
  if (!conversations[appointmentId]) conversations[appointmentId] = [];
  conversations[appointmentId].push({
    ...message,
    timestamp: new Date().toISOString(),
  });
  // Keep last 50 messages per appointment
  if (conversations[appointmentId].length > 50) {
    conversations[appointmentId] = conversations[appointmentId].slice(-50);
  }
}

export { INTENTS };
