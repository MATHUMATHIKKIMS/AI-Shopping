import React, { useState, useEffect } from 'react';
import {
  simulateTelemetry,
  triggerEmergencyStop,
  resetEmergencyStop,
  toggleAutoFollow,
  getVisionFeedUrl
} from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function AutonomousTrolley({ trolleyData, onRefresh }) {
  const [feedUrl, setFeedUrl] = useState(getVisionFeedUrl());
  const [userVisible, setUserVisible] = useState(true);
  const [userDist, setUserDist] = useState(85);
  const [userOffset, setUserOffset] = useState(0.0);
  const [obstacleDist, setObstacleDist] = useState(120);

  // Periodically refresh the simulated camera frame snapshot
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedUrl(getVisionFeedUrl());
      if (onRefresh) onRefresh();
    }, 600);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const handleSimulateChange = async (updates) => {
    const payload = {
      user_visible: updates.userVisible !== undefined ? updates.userVisible : userVisible,
      user_distance_cm: updates.userDist !== undefined ? updates.userDist : userDist,
      user_x_offset: updates.userOffset !== undefined ? updates.userOffset : userOffset,
      obstacle_distance_cm: updates.obstacleDist !== undefined ? updates.obstacleDist : obstacleDist,
      is_simulated_sensor: true
    };

    if (updates.userVisible !== undefined) setUserVisible(updates.userVisible);
    if (updates.userDist !== undefined) setUserDist(updates.userDist);
    if (updates.userOffset !== undefined) setUserOffset(updates.userOffset);
    if (updates.obstacleDist !== undefined) setObstacleDist(updates.obstacleDist);

    await simulateTelemetry(payload);
    if (onRefresh) onRefresh();
  };

  const handleToggleAutoFollow = async () => {
    const nextState = !trolleyData?.auto_follow_enabled;
    await toggleAutoFollow(nextState);
    if (onRefresh) onRefresh();
  };

  const handleEmergencyStop = async () => {
    await triggerEmergencyStop();
    if (onRefresh) onRefresh();
  };

  const handleResetEmergencyStop = async () => {
    await resetEmergencyStop();
    if (onRefresh) onRefresh();
  };

  const isEStop = trolleyData?.emergency_stop_latched;
  const isObstacle = trolleyData?.obstacle?.obstacle_detected;
  const currentObsDist = trolleyData?.obstacle?.distance_cm || obstacleDist;
  const safetyThreshold = trolleyData?.obstacle?.safety_threshold_cm || 30.0;

  // Obstacle Meter Percentage calculation
  const obsMeterPct = Math.min(100, Math.max(0, (currentObsDist / 200) * 100));
  const obsColor = currentObsDist < safetyThreshold ? '#dc2626' : currentObsDist < 60 ? '#d97706' : '#16a34a';

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
            Autonomous Trolley Computer Vision & Safety
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748b' }}>
            Multi-sensor fusion module: YOLO / OpenCV person tracking, ultrasonic obstacle detection, and fail-safe motion arbitration.
          </p>
        </div>

        {/* Big Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleToggleAutoFollow}
            className={trolleyData?.auto_follow_enabled ? 'btn-outline' : 'btn-success'}
            disabled={isEStop}
            style={{ padding: '12px 20px', fontSize: '1rem' }}
          >
            {trolleyData?.auto_follow_enabled ? '⏸️ Pause Auto-Follow' : '▶️ Engage Auto-Follow'}
          </button>

          {isEStop ? (
            <button
              onClick={handleResetEmergencyStop}
              className="btn-success"
              style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 800 }}
            >
              🔄 RESET EMERGENCY STOP
            </button>
          ) : (
            <button
              onClick={handleEmergencyStop}
              className="btn-danger"
              style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 800 }}
            >
              🛑 EMERGENCY STOP
            </button>
          )}
        </div>
      </div>

      {/* Main Vision & Telemetry Grid */}
      <div className="grid-2" style={{ marginBottom: '32px' }}>
        {/* Left Column: Live Vision Feed Snapshot */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark)' }}>
              📹 Camera Vision & Target Tracking Feed
            </h3>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
              SIMULATED / LIVE OPENCV
            </span>
          </div>

          {/* Video / Snapshot Container */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#000000',
              border: '2px solid #334155',
              aspectRatio: '4 / 3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={feedUrl}
              alt="Vision Feed"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />

            {/* In-Frame Status Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(15, 23, 42, 0.85)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                backdropFilter: 'blur(4px)'
              }}
            >
              STATE: <strong style={{ color: isEStop ? '#ef4444' : '#60a5fa' }}>{trolleyData?.trolley_state}</strong>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                background: 'rgba(15, 23, 42, 0.85)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                backdropFilter: 'blur(4px)'
              }}
            >
              TRACKER: <strong style={{ color: trolleyData?.tracking?.target_locked ? '#4ade80' : '#f87171' }}>
                {trolleyData?.tracking?.target_locked ? 'LOCKED (CONF 96%)' : 'SEARCHING'}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
            Note: ESP32 delegates computer vision to the host computer. Bounding box and distance telemetry are fed into the safety controller.
          </div>
        </div>

        {/* Right Column: Ultrasonic Sensor & Motor Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Obstacle Sensor Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '14px' }}>
              📡 Ultrasonic Obstacle Detection
            </h3>

            {/* Meter Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Distance to Obstacle:</span>
                <strong style={{ fontSize: '1.1rem', color: obsColor }}>
                  {currentObsDist.toFixed(1)} cm
                </strong>
              </div>
              <div style={{ background: '#e2e8f0', height: '14px', borderRadius: '7px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${obsMeterPct}%`,
                    height: '100%',
                    background: obsColor,
                    transition: 'width 0.3s ease, background 0.3s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                <span>0 cm (Collision)</span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>Critical Limit: {safetyThreshold} cm</span>
                <span>200+ cm (Clear)</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: isObstacle ? '#fef2f2' : '#f0fdf4',
                border: isObstacle ? '1px solid #fecaca' : '1px solid #bbf7d0',
                color: isObstacle ? '#b91c1c' : '#15803d',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              {isObstacle
                ? '⚠️ OBSTACLE ALERT: Distance is below the 30 cm safety threshold. Motor motion is inhibited!'
                : '✅ PATH CLEAR: No obstacles detected within the critical safety corridor.'}
            </div>
          </div>

          {/* Motor Controller Output */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '14px' }}>
              ⚙️ Differential Drive Motor Outputs
            </h3>

            <div className="grid-2" style={{ marginBottom: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block' }}>LEFT MOTOR PWM:</span>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                  {trolleyData?.motors?.left_motor_pwm || 0} / 255
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                  ({trolleyData?.motors?.left_motor_speed_pct || 0}% speed)
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block' }}>RIGHT MOTOR PWM:</span>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                  {trolleyData?.motors?.right_motor_pwm || 0} / 255
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                  ({trolleyData?.motors?.right_motor_speed_pct || 0}% speed)
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#475569' }}>
              Kinematic Command: <strong style={{ color: '#1e3a8a' }}>{trolleyData?.motors?.direction || 'STOP'}</strong> &bull; Driver: {trolleyData?.motors?.driver_mode}
            </div>
          </div>
        </div>
      </div>

      {/* College Review Demonstration Simulation Controls */}
      <div className="card" style={{ border: '2px solid #3b82f6', background: '#f8fbff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
              🎛️ Evaluator Review Simulation Panel
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Use these sliders to simulate test cases live during your college demonstration without physical sensors connected.
            </p>
          </div>
          <span className="badge badge-primary">LIVE SIMULATOR ACTIVE</span>
        </div>

        <div className="grid-3" style={{ gap: '20px' }}>
          {/* Obstacle Distance Slider */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              Simulate Obstacle Distance: {obstacleDist} cm
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={obstacleDist}
              onChange={(e) => handleSimulateChange({ obstacleDist: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleSimulateChange({ obstacleDist: 20 })}
                className="btn-danger"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                Trigger Hazard (20cm)
              </button>
              <button
                type="button"
                onClick={() => handleSimulateChange({ obstacleDist: 140 })}
                className="btn-success"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                Clear Path (140cm)
              </button>
            </div>
          </div>

          {/* User Presence & Distance */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              User Target Distance: {userDist} cm
            </label>
            <input
              type="range"
              min="40"
              max="200"
              step="5"
              value={userDist}
              onChange={(e) => handleSimulateChange({ userDist: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleSimulateChange({ userVisible: !userVisible })}
                className={userVisible ? 'btn-danger' : 'btn-success'}
                style={{ fontSize: '0.8rem', padding: '6px 12px', width: '100%' }}
              >
                {userVisible ? 'Simulate User Walking Out of Frame' : 'Simulate User Entering Frame'}
              </button>
            </div>
          </div>

          {/* Lateral Offset / Steering */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              Steering Lateral Offset: {userOffset > 0 ? `+${userOffset} (Right)` : userOffset < 0 ? `${userOffset} (Left)` : '0.0 (Center)'}
            </label>
            <input
              type="range"
              min="-0.8"
              max="0.8"
              step="0.1"
              value={userOffset}
              onChange={(e) => handleSimulateChange({ userOffset: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleSimulateChange({ userOffset: -0.5 })}
                className="btn-outline"
                style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1 }}
              >
                Turn Left
              </button>
              <button
                type="button"
                onClick={() => handleSimulateChange({ userOffset: 0.0 })}
                className="btn-outline"
                style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1 }}
              >
                Center
              </button>
              <button
                type="button"
                onClick={() => handleSimulateChange({ userOffset: 0.5 })}
                className="btn-outline"
                style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1 }}
              >
                Turn Right
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

