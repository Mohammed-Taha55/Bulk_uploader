import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import MailingPage from './pages/MailingPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <NavBar />
        <main className="page-content">
          <Routes>
            <Route path="/"          element={<Navigate to="/mailing" replace />} />
            <Route path="/mailing"   element={<MailingPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
