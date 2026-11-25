import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute, RequireRole } from './components/guards';
import BarOrders from './pages/BarOrders';
import Dashboard from './pages/Dashboard';
import Housekeeping from './pages/Housekeeping';
import Inventory from './pages/Inventory';
import Kitchen from './pages/Kitchen';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import RoomBookings from './pages/RoomBookings';
import Services from './pages/Services';
import Settings from './pages/Settings';
import Users from './pages/Users';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route
              path="orders"
              element={
                <RequireRole roles={['admin', 'manager', 'waiter', 'accountant']}>
                  <Orders />
                </RequireRole>
              }
            />
            <Route
              path="room-bookings"
              element={
                <RequireRole roles={['admin', 'manager', 'accountant', 'receptionist']}>
                  <RoomBookings />
                </RequireRole>
              }
            />
            <Route
              path="services"
              element={
                <RequireRole roles={['admin', 'manager']}>
                  <Services />
                </RequireRole>
              }
            />
            <Route
              path="kitchen"
              element={
                <RequireRole roles={['admin', 'manager', 'chef']}>
                  <Kitchen />
                </RequireRole>
              }
            />
            <Route
              path="bar"
              element={
                <RequireRole roles={['admin', 'manager', 'bar_manager']}>
                  <BarOrders />
                </RequireRole>
              }
            />
            <Route
              path="housekeeping"
              element={
                <RequireRole roles={['admin', 'manager', 'housekeeping']}>
                  <Housekeeping />
                </RequireRole>
              }
            />
            <Route
              path="inventory"
              element={
                <RequireRole roles={['admin', 'manager', 'accountant', 'food_storekeeper', 'beverage_storekeeper']}>
                  <Inventory />
                </RequireRole>
              }
            />
            <Route
              path="reports"
              element={
                <RequireRole roles={['admin', 'manager', 'accountant']}>
                  <Reports />
                </RequireRole>
              }
            />
            <Route
              path="users"
              element={
                <RequireRole roles={['admin', 'manager']}>
                  <Users />
                </RequireRole>
              }
            />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
