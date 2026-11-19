import React from 'react';

export default function StatusBadge({ state, label }) {
  let badgeClass = 'badge-muted';
  let dotColor = '#94a3b8';
  let text = label || state || 'UNKNOWN';

  switch (state) {
    case 'FOLLOWING':
      badgeClass = 'badge-success';
      dotColor = '#16a34a';
      text = label || 'FOLLOWING USER';
      break;
    case 'OBSTACLE_DETECTED':
      badgeClass = 'badge-danger';
      dotColor = '#dc2626';
      text = label || 'OBSTACLE DETECTED';
      break;
    case 'EMERGENCY_STOP':
      badgeClass = 'badge-danger';
      dotColor = '#dc2626';
      text = label || 'EMERGENCY STOPPED';
      break;
    case 'USER_LOST':
      badgeClass = 'badge-warning';
      dotColor = '#d97706';
      text = label || 'USER LOST';
      break;
    case 'STOPPED':
      badgeClass = 'badge-muted';
      dotColor = '#64748b';
      text = label || 'STOPPED (SAFE)';
      break;
    case 'IDLE':
      badgeClass = 'badge-primary';
      dotColor = '#2563eb';
      text = label || 'STANDBY / IDLE';
      break;
    default:
      break;
  }

  return (
    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block'
        }}
        className={state === 'FOLLOWING' || state === 'EMERGENCY_STOP' ? 'pulse-active' : ''}
      />
      {text}
    </span>
  );
}

