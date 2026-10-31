export function bookingMessage(viewing, link) {
  const { prospect, unit, date, time, lastDecision } = viewing;
  const request = lastDecision?.request;
  const explanation = viewing.status === 'Slot Unavailable'
    ? 'Your requested slot' + (request ? ' on ' + request.date + ' at ' + request.time : '') + ' is unavailable. Your original viewing on ' + date + ' at ' + time + ' (SAST) is still reserved. Use the link to keep the original time or cancel.'
    : lastDecision?.action === 'approve'
      ? 'Your new viewing time has been approved: ' + date + ' at ' + time + ' (SAST).'
      : 'Your viewing is scheduled for ' + date + ' at ' + time + ' (SAST).';
  return ['Hi ' + prospect + '!', '', explanation, '', 'Property: ' + unit, '', 'Manage your appointment using this private link:', link, '', 'OC Rental · Pulse'].join('\n');
}
