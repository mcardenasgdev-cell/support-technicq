export function phaseFor(room, now = Date.now()) {
  if (!room.started || now < room.started) return 'lobby';
  if (now - room.started >= 600000) return 'finished';
  return now - room.started >= 300000 ? 'second' : 'first';
}
export function roleFor(room, member, now = Date.now()) {
  const swapped = phaseFor(room, now) === 'second' || phaseFor(room, now) === 'finished';
  return (member.team + Number(swapped)) % 2 === 0 ? 'support' : 'client';
}
