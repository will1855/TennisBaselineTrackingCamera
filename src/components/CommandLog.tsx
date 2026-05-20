import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  id: number;
  timestamp: string;
  direction: string;
  speed: number;
  confidence: number;
  reason?: string;
}

interface CommandLogProps {
  entries: LogEntry[];
}

/**
 * CommandLog
 *
 * Displays the last 20 commands with timestamp, direction, speed, and confidence.
 * Auto-scrolls to the newest entry.
 */
const CommandLog: React.FC<CommandLogProps> = ({ entries }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="command-log">
      <div className="log-header">
        <span className="log-title">Command Log</span>
        <span className="log-count">{entries.length} / 20</span>
      </div>
      <div className="log-entries" ref={listRef}>
        {entries.length === 0 && (
          <div className="log-empty">No commands yet — start tracking</div>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className={`log-entry log-${e.direction.toLowerCase()}`}
          >
            <span className="log-ts">{e.timestamp}</span>
            <span className={`log-dir log-dir-${e.direction.toLowerCase()}`}>
              {e.direction === 'LEFT' ? '◀' : e.direction === 'RIGHT' ? '▶' : '■'} {e.direction}
            </span>
            <span className="log-meta">
              spd={e.speed.toFixed(2)} conf={e.confidence.toFixed(2)}
              {e.reason ? ` [${e.reason}]` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommandLog;
