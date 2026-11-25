import { useMemo, useState } from 'react';
import { BedDouble, CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { ROOM_NIGHTLY_RATES } from '../data/constants';
import { formatCurrency } from '../utils/format';
import { Badge, EmptyState, PageHeader } from '../components/ui';

const ROOM_TYPES = Object.keys(ROOM_NIGHTLY_RATES);

function createEmptyForm() {
  return {
    type: 'Food',
    name: '',
    price: '',
    roomId: '',
    roomTypeChoice: ROOM_TYPES[0],
    customRoomType: '',
    floor: '1',
    nightlyRate: String(ROOM_NIGHTLY_RATES[ROOM_TYPES[0]]),
  };
}

export default function Services() {
  const { user } = useAuth();
  const { menuItems, rooms, addService } = useAppData();
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const roomType = form.roomTypeChoice === 'Custom' ? form.customRoomType.trim() : form.roomTypeChoice;
  const sortedRooms = useMemo(
    () => [...rooms].sort((first, second) => first.id.localeCompare(second.id, undefined, { numeric: true })),
    [rooms],
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'roomTypeChoice'
        ? { nightlyRate: String(ROOM_NIGHTLY_RATES[value] || '') }
        : {}),
    }));
    setError('');
    setToast('');
  };

  const submitService = (event) => {
    event.preventDefault();
    const service = form.type === 'Room'
      ? {
          type: 'Room',
          roomId: form.roomId,
          roomType,
          floor: Number(form.floor),
          nightlyRate: Number(form.nightlyRate),
        }
      : {
          type: form.type,
          name: form.name,
          price: Number(form.price),
        };
    const result = addService(service, user.name, user.role);
    if (!result.success) {
      setError(result.error);
      return;
    }

    setToast(form.type === 'Room'
      ? `Room ${result.service.id} was added and is available on Housekeeping.`
      : `${result.service.name} was added to the waiter order menu.`);
    setForm(createEmptyForm());
  };

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Add food, drinks and rooms for the waiter, bar and housekeeping workflows."
      />

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}

      <div className="services-layout">
        <form className="card service-form" onSubmit={submitService}>
          <div className="card-head">
            <div>
              <h3>Add a service</h3>
              <p>New rooms start clean; food and drinks appear in the waiter order menu.</p>
            </div>
            <Badge tone="violet">{user.role === 'admin' ? 'Administrator' : 'Manager'}</Badge>
          </div>

          <label className="field">
            <span>Service type</span>
            <select value={form.type} onChange={(event) => updateField('type', event.target.value)}>
              <option value="Food">Food</option>
              <option value="Drinks">Drinks</option>
              <option value="Room">Room</option>
            </select>
          </label>

          {form.type === 'Room' ? (
            <div className="form-grid">
              <label className="field">
                <span>Room number</span>
                <input required value={form.roomId} onChange={(event) => updateField('roomId', event.target.value)} placeholder="e.g. 301" />
              </label>
              <label className="field">
                <span>Room type</span>
                <select value={form.roomTypeChoice} onChange={(event) => updateField('roomTypeChoice', event.target.value)}>
                  {ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  <option value="Custom">Other type</option>
                </select>
              </label>
              {form.roomTypeChoice === 'Custom' && (
                <label className="field">
                  <span>Custom room type</span>
                  <input required value={form.customRoomType} onChange={(event) => updateField('customRoomType', event.target.value)} placeholder="e.g. Family" />
                </label>
              )}
              <label className="field">
                <span>Floor</span>
                <input required type="number" min="1" step="1" value={form.floor} onChange={(event) => updateField('floor', event.target.value)} />
              </label>
              <label className="field">
                <span>Nightly rate (RWF)</span>
                <input required type="number" min="1" step="1" value={form.nightlyRate} onChange={(event) => updateField('nightlyRate', event.target.value)} />
              </label>
            </div>
          ) : (
            <div className="form-grid">
              <label className="field">
                <span>{form.type === 'Food' ? 'Food name' : 'Drink name'}</span>
                <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={form.type === 'Food' ? 'e.g. Vegetable curry' : 'e.g. Lemon soda'} />
              </label>
              <label className="field">
                <span>Selling price (RWF)</span>
                <input required type="number" min="1" step="1" value={form.price} onChange={(event) => updateField('price', event.target.value)} />
              </label>
              {form.type === 'Drinks' && (
                <p className="muted service-hint">
                  A beverage stock record is created with zero stock. Add its stock in Inventory before the storekeeper issues orders.
                </p>
              )}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Add {form.type === 'Room' ? 'room' : 'menu item'}
          </button>
        </form>

        <section className="card">
          <div className="card-head">
            <div><h3>Where new services appear</h3><p>Changes are saved in this POS workspace and update staff screens immediately.</p></div>
          </div>
          <ul className="booking-steps">
            <li>Food and drinks are added to the menu used by waiters when creating orders.</li>
            <li>Food orders go to the kitchen; drinks go to the Bar Manager and beverage storekeeper.</li>
            <li>Rooms appear on Housekeeping as clean and ready, and reception can book them at the listed rate.</li>
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div><h3>Food and drinks</h3><p>{menuItems.length} menu items available to order</p></div>
          <ClipboardList size={18} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Service</th><th>Category</th><th>Price</th><th>Order station</th></tr></thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td><Badge tone={item.category === 'Drinks' ? 'info' : 'primary'}>{item.category}</Badge></td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{item.category === 'Drinks' ? 'Bar' : 'Kitchen'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div><h3>Rooms</h3><p>{rooms.length} rooms available to housekeeping</p></div>
          <BedDouble size={18} />
        </div>
        {sortedRooms.length === 0 ? (
          <EmptyState icon={BedDouble} title="No rooms configured" description="Add a room to send it to Housekeeping." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Room</th><th>Type</th><th>Floor</th><th>Nightly rate</th><th>Status</th></tr></thead>
              <tbody>
                {sortedRooms.map((room) => (
                  <tr key={room.id}>
                    <td><strong>{room.id}</strong></td>
                    <td>{room.type}</td>
                    <td>{room.floor}</td>
                    <td>{formatCurrency(room.nightlyRate ?? ROOM_NIGHTLY_RATES[room.type] ?? 0)}</td>
                    <td><Badge tone={room.status === 'clean' ? 'success' : 'muted'}>{room.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
