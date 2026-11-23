import { useState } from 'react';
import {
  BedDouble,
  CheckCircle2,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { PageHeader, StatusBadge } from '../components/ui';

const FILTERS = ['all', 'clean', 'dirty', 'cleaning', 'occupied'];

const ACTIONS = {
  clean: [
    { label: 'Mark dirty', next: 'dirty', variant: 'ghost' },
    { label: 'Mark occupied', next: 'occupied', variant: 'ghost' },
  ],
  dirty: [
    { label: 'Start cleaning', next: 'cleaning', variant: 'ghost' },
    { label: 'Mark clean', next: 'clean', variant: 'primary' },
  ],
  cleaning: [{ label: 'Finish cleaning', next: 'clean', variant: 'primary' }],
  occupied: [{ label: 'Check out', next: 'dirty', variant: 'ghost' }],
};

export default function Housekeeping() {
  const { user } = useAuth();
  const { rooms, setRoomStatus } = useAppData();
  const [filter, setFilter] = useState('all');

  const counts = {
    all: rooms.length,
    clean: rooms.filter((room) => room.status === 'clean').length,
    dirty: rooms.filter((room) => room.status === 'dirty').length,
    cleaning: rooms.filter((room) => room.status === 'cleaning').length,
    occupied: rooms.filter((room) => room.status === 'occupied').length,
  };

  const visible = rooms.filter((room) => filter === 'all' || room.status === filter);

  return (
    <>
      <PageHeader
        title="Housekeeping"
        subtitle="Track room readiness and share status with reception."
        actions={
          <span className="live-pill">
            <span className="live-dot" /> Room status live
          </span>
        }
      />

      <div className="summary-grid">
        <div className="mini-stat">
          <span className="stat-icon tone-success"><CheckCircle2 size={18} /></span>
          <div><strong>{counts.clean}</strong><small>Clean &amp; ready</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-warning"><Wrench size={18} /></span>
          <div><strong>{counts.dirty}</strong><small>Needs cleaning</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-info"><Sparkles size={18} /></span>
          <div><strong>{counts.cleaning}</strong><small>Being cleaned</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-violet"><UserRound size={18} /></span>
          <div><strong>{counts.occupied}</strong><small>Occupied</small></div>
        </div>
      </div>

      <div className="tabs tabs-inline">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All rooms' : status.replace(/^\w/, (char) => char.toUpperCase())}
            <span className="tab-count">{counts[status]}</span>
          </button>
        ))}
      </div>

      <div className="room-grid">
        {visible.map((room) => (
          <article className="room-card" key={room.id}>
            <div className="room-head">
              <span className="room-icon">
                <BedDouble size={20} />
              </span>
              <div>
                <strong>Room {room.id}</strong>
                <small>{room.type} · Floor {room.floor}</small>
              </div>
              <StatusBadge status={room.status} />
            </div>

            <div className="room-body">
              <span>Guest</span>
              <strong>{room.guest || (room.status === 'occupied' ? 'In-house guest' : '—')}</strong>
            </div>

            <div className="room-actions">
              {ACTIONS[room.status]?.map((action) => (
                <button
                  key={action.next}
                  type="button"
                  className={`btn btn-sm ${action.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setRoomStatus(room.id, action.next, user.name)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="page-footnote">
        Cleaning status is shared with reception so front-desk staff always know which rooms are ready.
      </p>
    </>
  );
}
