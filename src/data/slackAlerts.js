/**
 * Slack / Teams Alert Service
 *
 * Sends webhook notifications to Slack or Microsoft Teams channels.
 * Supports: no-shows, cancellations, closed deals, rep milestones, daily digests.
 * Channel routing by territory or alert type.
 *
 * Configuration: Set webhook URLs as environment variables:
 *   SLACK_WEBHOOK_GENERAL   — general scheduling alerts
 *   SLACK_WEBHOOK_SALES     — closed deals, milestones
 *   SLACK_WEBHOOK_OPS       — no-shows, cancellations
 *   TEAMS_WEBHOOK_URL       — Microsoft Teams (optional)
 */

// Alert types and their channel routing
const ALERT_TYPES = {
  no_show:      { channel: 'ops',     emoji: '🚫', color: '#F87171', label: 'No-Show' },
  cancel:       { channel: 'ops',     emoji: '❌', color: '#F97316', label: 'Cancellation' },
  closed_deal:  { channel: 'sales',   emoji: '🎉', color: '#2DD4A8', label: 'Deal Closed' },
  big_deal:     { channel: 'sales',   emoji: '💰', color: '#F0A830', label: 'Big Deal!' },
  milestone:    { channel: 'sales',   emoji: '🏆', color: '#9333EA', label: 'Milestone' },
  new_booking:  { channel: 'general', emoji: '📅', color: '#3B82F6', label: 'New Booking' },
  reassign:     { channel: 'general', emoji: '🔄', color: '#6366F1', label: 'Reassigned' },
  daily_digest: { channel: 'general', emoji: '📊', color: '#F0A830', label: 'Daily Digest' },
};

/**
 * Send a Slack alert via webhook.
 * Falls back gracefully if webhook is not configured.
 */
export async function sendSlackAlert(type, data) {
  const config = ALERT_TYPES[type];
  if (!config) {
    console.warn(`Unknown alert type: ${type}`);
    return;
  }

  try {
    const payload = buildSlackPayload(type, config, data);
    const res = await fetch('/api/slack/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, channel: config.channel, payload }),
    });
    if (!res.ok) {
      console.warn(`Slack alert failed (${res.status}):`, await res.text());
    }
  } catch (err) {
    console.warn('Slack alert failed (non-blocking):', err.message);
  }
}

function buildSlackPayload(type, config, data) {
  const blocks = [];

  // Header
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `${config.emoji} ${config.label}`, emoji: true },
  });

  switch (type) {
    case 'no_show':
      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customer || '—'}` },
          { type: 'mrkdwn', text: `*Rep:*\n${data.rep || '—'}` },
          { type: 'mrkdwn', text: `*Time:*\n${data.date} at ${data.time}` },
          { type: 'mrkdwn', text: `*Territory:*\n${data.territory || '—'}` },
        ],
      });
      if (data.note) {
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `_${data.note}_` } });
      }
      break;

    case 'cancel':
      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customer || '—'}` },
          { type: 'mrkdwn', text: `*Reason:*\n${data.reason || '—'}` },
          { type: 'mrkdwn', text: `*Time:*\n${data.date} at ${data.time}` },
          { type: 'mrkdwn', text: `*Rep:*\n${data.rep || '—'}` },
        ],
      });
      break;

    case 'closed_deal':
    case 'big_deal':
      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customer || '—'}` },
          { type: 'mrkdwn', text: `*Rep:*\n${data.rep || '—'}` },
          { type: 'mrkdwn', text: `*Territory:*\n${data.territory || '—'}` },
          { type: 'mrkdwn', text: `*Source:*\n${data.leadSource || '—'}` },
        ],
      });
      if (data.revenue) {
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: `💵 *Revenue:* $${data.revenue.toLocaleString()}` },
        });
      }
      break;

    case 'milestone':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${data.rep}* just hit a milestone: *${data.milestone}*\n${data.details || ''}`,
        },
      });
      break;

    case 'new_booking':
      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customer || '—'}` },
          { type: 'mrkdwn', text: `*Time:*\n${data.date} at ${data.time}` },
          { type: 'mrkdwn', text: `*Source:*\n${data.leadSource || '—'}` },
          { type: 'mrkdwn', text: `*Territory:*\n${data.territory || '—'}` },
        ],
      });
      break;

    case 'daily_digest':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `📅 *${data.date}*`,
            `Total appointments: *${data.totalAppts}*`,
            `Completed (sat): *${data.sits}*`,
            `Closed deals: *${data.closed}*`,
            `No-shows: *${data.noShows}*`,
            `Cancellations: *${data.canceled}*`,
            data.topRep ? `🏆 Top performer: *${data.topRep}*` : '',
          ].filter(Boolean).join('\n'),
        },
      });
      break;

    default:
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: JSON.stringify(data, null, 2) },
      });
  }

  return {
    text: `${config.emoji} ${config.label}`, // fallback text
    blocks,
    attachments: [{
      color: config.color,
      blocks: [],
    }],
  };
}

/**
 * Build a Microsoft Teams Adaptive Card payload.
 */
export function buildTeamsPayload(type, data) {
  const config = ALERT_TYPES[type];
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: config?.color?.replace('#', '') || 'F0A830',
    summary: `${config?.emoji} ${config?.label}`,
    sections: [{
      activityTitle: `${config?.emoji} ${config?.label}`,
      facts: Object.entries(data)
        .filter(([, v]) => v != null && v !== '')
        .slice(0, 8)
        .map(([k, v]) => ({ name: k.replace(/([A-Z])/g, ' $1').trim(), value: String(v) })),
    }],
  };
}

export { ALERT_TYPES };
