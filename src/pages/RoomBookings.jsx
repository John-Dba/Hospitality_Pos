import { useEffect, useMemo, useState } from 'react';
import { BedDouble, CheckCircle2, Printer, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { PAYMENT_METHODS, RECEIPT_PAYMENT_DETAILS, ROOM_NIGHTLY_RATES } from '../data/constants';
import { formatCurrency } from '../utils/format';
import { Badge, EmptyState, Modal, PageHeader, StatusBadge } from '../components/ui';

const PAGE_LOADED_AT = Date.now();

function toLocalDateTimeInput(date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function getDefaultDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 1);
  checkIn.setHours(14, 0, 0, 0);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  checkOut.setHours(11, 0, 0, 0);
  return { checkIn: toLocalDateTimeInput(checkIn), checkOut: toLocalDateTimeInput(checkOut) };
}

function getNightCount(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endDay - startDay) / 86400000));
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function getRoomNightlyRate(room) {
  return Number(room.nightlyRate ?? ROOM_NIGHTLY_RATES[room.type] ?? 0);
}

const initialForm = () => ({
  guestType: 'single',
  guestName: '',
  secondGuestName: '',
  phone: '',
  roomId: '',
  ...getDefaultDates(),
});

export default function RoomBookings() {
  const { user } = useAuth();
  const {
    rooms,
    roomBookings,
    createRoomBooking,
    setRoomBookingPayment,
    setRoomBookingPaymentMethod,
  } = useAppData();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [paymentMethodBooking, setPaymentMethodBooking] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const canCreate = ['receptionist', 'manager', 'admin'].includes(user.role);
  const canApprovePayment = user.role === 'accountant';
  const canPrintReceipt = ['receptionist', 'manager', 'admin'].includes(user.role);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!receiptBooking) return undefined;
    const clearReceipt = () => setReceiptBooking(null);
    window.addEventListener('afterprint', clearReceipt, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', clearReceipt);
  }, [receiptBooking]);

  const isStayValid = useMemo(() => {
    const start = Date.parse(form.checkIn);
    const end = Date.parse(form.checkOut);
    return Number.isFinite(start) && start > PAGE_LOADED_AT &&
      Number.isFinite(end) && end > start && getNightCount(form.checkIn, form.checkOut) > 0;
  }, [form.checkIn, form.checkOut]);

  const availableRooms = useMemo(() => {
    if (!isStayValid) return [];
    const start = Date.parse(form.checkIn);
    const end = Date.parse(form.checkOut);
    return rooms.filter((room) => (
      room.status === 'clean' &&
      !roomBookings.some((booking) => (
        booking.roomId === room.id &&
        booking.status !== 'cancelled' &&
        start < Date.parse(booking.checkOut) &&
        Date.parse(booking.checkIn) < end
      ))
    ));
  }, [rooms, roomBookings, form.checkIn, form.checkOut, isStayValid]);

  const selectedRoom = rooms.find((room) => room.id === form.roomId);
  const nightlyRate = selectedRoom ? getRoomNightlyRate(selectedRoom) : 0;
  const nights = getNightCount(form.checkIn, form.checkOut);
  const total = nightlyRate * nights;

  const visibleBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roomBookings.filter((booking) => (
      !term ||
      booking.id.toLowerCase().includes(term) ||
      booking.guestName.toLowerCase().includes(term) ||
      booking.phone.toLowerCase().includes(term) ||
      booking.roomId.toLowerCase().includes(term)
    ));
  }, [roomBookings, search]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const submitBooking = (event) => {
    event.preventDefault();
    setError('');
    const result = createRoomBooking({
      ...form,
      nightlyRate,
    }, user.name, user.role);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setToast(`Booking ${result.booking.id} created. Print the guest receipt when ready.`);
    setForm(initialForm());
  };

  const approvePayment = (booking) => {
    const result = setRoomBookingPayment(booking.id, 'paid', user.name, user.role);
    if (!result.success) {
      setToast(result.error);
      return;
    }
    setToast(`Payment approved for ${booking.id}. Reception can now print the final receipt.`);
  };

  const requestReceiptPrint = (booking) => {
    const current = roomBookings.find((entry) => entry.id === booking.id);
    if (!current) {
      setToast('This booking is no longer available.');
      return;
    }
    if (current.payment === 'paid' && current.paymentMethod) {
      setReceiptBooking({ ...current, printedAt: new Date().toISOString() });
      return;
    }
    setSelectedPaymentMethod(current.paymentMethod || PAYMENT_METHODS[0]);
    setPaymentMethodBooking(current);
  };

  const printWithSelectedPaymentMethod = () => {
    const result = setRoomBookingPaymentMethod(
      paymentMethodBooking.id,
      selectedPaymentMethod,
      user.name,
      user.role,
    );
    if (!result.success) {
      setToast(result.error);
      setPaymentMethodBooking(null);
      return;
    }
    setReceiptBooking({
      ...paymentMethodBooking,
      paymentMethod: selectedPaymentMethod,
      printedAt: new Date().toISOString(),
    });
    setPaymentMethodBooking(null);
  };

  return (
    <>
      <PageHeader
        title="Room bookings"
        subtitle="Manage guest reservations, room availability and payment-approved receipts."
        actions={<span className="live-pill"><span className="live-dot" /> Booking records live</span>}
      />

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}

      {canCreate && (
        <div className="booking-layout">
          <form className="card booking-form" onSubmit={submitBooking}>
            <div className="card-head">
              <div>
                <h3>New reservation</h3>
                <p>Reservation time is recorded automatically when saved.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Guest type</span>
                <select value={form.guestType} onChange={(event) => updateForm('guestType', event.target.value)}>
                  <option value="single">One guest</option>
                  <option value="couple">Couple</option>
                </select>
              </label>
              <label className="field">
                <span>{form.guestType === 'couple' ? 'First guest full name' : 'Guest full name'}</span>
                <input required value={form.guestName} onChange={(event) => updateForm('guestName', event.target.value)} />
              </label>
              {form.guestType === 'couple' && (
                <label className="field">
                  <span>Second guest full name</span>
                  <input required value={form.secondGuestName} onChange={(event) => updateForm('secondGuestName', event.target.value)} />
                </label>
              )}
              <label className="field">
                <span>Contact phone</span>
                <input required type="tel" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="+250 7xx xxx xxx" />
              </label>
              <label className="field">
                <span>Check-in date and time</span>
                <input required type="datetime-local" value={form.checkIn} onChange={(event) => updateForm('checkIn', event.target.value)} />
              </label>
              <label className="field">
                <span>Check-out date and time</span>
                <input required type="datetime-local" value={form.checkOut} onChange={(event) => updateForm('checkOut', event.target.value)} />
              </label>
              <label className="field">
                <span>Available clean room</span>
                <select required value={form.roomId} onChange={(event) => updateForm('roomId', event.target.value)}>
                  <option value="">Select a room</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.id} · {room.type} · {formatCurrency(getRoomNightlyRate(room))}/night
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {availableRooms.length > 0 ? (
              <div className="available-room-list">
                {availableRooms.map((room) => (
                  <div className="available-room" key={room.id}>
                    <BedDouble size={17} />
                    <span><strong>Room {room.id}</strong><small>{room.type} · Floor {room.floor}</small></span>
                    <b>{formatCurrency(getRoomNightlyRate(room))}<small>/night</small></b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted booking-hint">
                {isStayValid ? 'No clean rooms are available for those dates.' : 'Choose a future check-in and a later check-out to see room availability.'}
              </p>
            )}

            <div className="booking-total">
              <span>
                {selectedRoom
                  ? `${nights} night${nights === 1 ? '' : 's'} × ${formatCurrency(nightlyRate)} per night`
                  : 'Select a room to calculate the stay total'}
              </span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={!form.roomId || !canCreate}>
              Create booking
            </button>
          </form>

          <section className="card">
            <div className="card-head">
              <div><h3>Payment workflow</h3><p>Unpaid receipts are provisional; only an accountant can approve payment.</p></div>
              <Badge tone="info">Reception</Badge>
            </div>
            <ol className="booking-steps">
              <li>Record guest details and stay dates. Choose the payment method when preparing the receipt.</li>
              <li>Print the booking receipt before payment if the guest needs a copy.</li>
              <li>The accountant approves payment from this booking list.</li>
              <li>Reception prints the final receipt marked PAID with a thank-you message.</li>
            </ol>
          </section>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <div><h3>Reservations</h3><p>{roomBookings.length} booking{roomBookings.length === 1 ? '' : 's'} recorded</p></div>
          <div className="input-wrap search-wrap">
            <Search size={16} />
            <input type="search" placeholder="Search guest, room or booking" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        {visibleBookings.length === 0 ? (
          <EmptyState icon={BedDouble} title="No room bookings found" description="New reservations will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Booking / guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Payment</th><th className="align-right">Actions</th></tr>
              </thead>
              <tbody>
                {visibleBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>{booking.id}</strong><span className="cell-sub">{booking.guestName}{booking.secondGuestName ? ` & ${booking.secondGuestName}` : ''} · {booking.phone}</span></td>
                    <td>Room {booking.roomId}<span className="cell-sub">{booking.roomType}</span></td>
                    <td>{formatDateTime(booking.checkIn)}<span className="cell-sub">to {formatDateTime(booking.checkOut)} · {booking.nights} night(s)</span></td>
                    <td><strong>{formatCurrency(booking.total)}</strong><span className="cell-sub">{booking.paymentMethod || 'Choose on receipt'}</span></td>
                    <td><StatusBadge status={booking.payment} /></td>
                    <td>
                      <div className="row-actions end">
                        {canApprovePayment && booking.payment === 'unpaid' && (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => approvePayment(booking)}>
                            Approve paid
                          </button>
                        )}
                        {canPrintReceipt && (
                          <button type="button" className="icon-btn icon-btn-primary" title={booking.payment === 'paid' ? 'Print final paid receipt' : 'Print provisional receipt'} onClick={() => requestReceiptPrint(booking)}>
                            <Printer size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(paymentMethodBooking)}
        onClose={() => setPaymentMethodBooking(null)}
        title="Choose receipt payment method"
        subtitle="This records the method shown on the receipt. The accountant still approves the payment separately."
      >
        <div className="settings-form">
          <label className="field">
            <span>Payment method</span>
            <select
              value={selectedPaymentMethod}
              onChange={(event) => setSelectedPaymentMethod(event.target.value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPaymentMethodBooking(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={printWithSelectedPaymentMethod}>
              <Printer size={16} /> Print receipt
            </button>
          </div>
        </div>
      </Modal>

      {receiptBooking && (
        <article className="print-receipt" aria-label={`Receipt for ${receiptBooking.id}`}>
          <header className="receipt-header">
            <strong>HOSPITALITY POS</strong>
            <span>Room reservation receipt</span>
          </header>
          <div className="receipt-meta">
            <div><span>Booking</span><strong>{receiptBooking.id}</strong></div>
            <div><span>Guest</span><strong>{receiptBooking.guestName}{receiptBooking.secondGuestName ? ` & ${receiptBooking.secondGuestName}` : ''}</strong></div>
            <div><span>Phone</span><strong>{receiptBooking.phone}</strong></div>
            <div><span>Room</span><strong>{receiptBooking.roomId} · {receiptBooking.roomType}</strong></div>
            <div><span>Check-in</span><strong>{formatDateTime(receiptBooking.checkIn)}</strong></div>
            <div><span>Check-out</span><strong>{formatDateTime(receiptBooking.checkOut)}</strong></div>
            <div><span>Booked at</span><strong>{formatDateTime(receiptBooking.createdAt)}</strong></div>
            <div><span>Printed at</span><strong>{formatDateTime(receiptBooking.printedAt)}</strong></div>
            <div><span>Payment method</span><strong>{receiptBooking.paymentMethod}</strong></div>
            <div><span>Payment status</span><strong>{receiptBooking.payment.toUpperCase()}</strong></div>
            {receiptBooking.payment === 'paid' && (
              <div><span>Approved by</span><strong>{receiptBooking.approvedBy} · {formatDateTime(receiptBooking.approvedAt)}</strong></div>
            )}
          </div>
          <div className="receipt-items">
            <div className="receipt-item">
              <span>{receiptBooking.roomType} room<small>{receiptBooking.nights} night(s) × {formatCurrency(receiptBooking.nightlyRate)}</small></span>
              <strong>{formatCurrency(receiptBooking.total)}</strong>
            </div>
          </div>
          <div className="receipt-total">
            <span>{receiptBooking.payment === 'paid' ? 'Total paid' : 'Total due'}</span>
            <strong>{formatCurrency(receiptBooking.total)}</strong>
          </div>
          {receiptBooking.payment !== 'paid' && (
            <div className="receipt-payment">
              <strong>Payment options</strong>
              <div><span>MoMo</span><b>{RECEIPT_PAYMENT_DETAILS.mobileMoneyNumber}</b></div>
              <div><span>MoMo Code</span><b>{RECEIPT_PAYMENT_DETAILS.mobileMoneyCode}</b></div>
              <div><span>Equity Bank</span><b>{RECEIPT_PAYMENT_DETAILS.equityBankAccount}</b></div>
            </div>
          )}
          <footer>
            {receiptBooking.payment === 'paid'
              ? 'Thank you for choosing us. We look forward to welcoming you again!'
              : 'Thank you. Please present this receipt to reception to complete payment.'}
          </footer>
        </article>
      )}
    </>
  );
}
