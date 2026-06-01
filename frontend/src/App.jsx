import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import SendersPage from './pages/SendersPage.jsx';
import RecipientsPage from './pages/RecipientsPage.jsx';
import UploadLogsPage from './pages/UploadLogsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <NavBar />
        <main className="page-content">
          <Routes>
            <Route path="/"           element={<Navigate to="/senders" replace />} />
            <Route path="/senders"    element={<SendersPage />} />
            <Route path="/recipients" element={<RecipientsPage />} />
            <Route path="/logs"       element={<UploadLogsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
