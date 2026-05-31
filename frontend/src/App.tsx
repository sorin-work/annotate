import { Navigate, Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import Layout from './components/Layout';
import ActivityPage from './pages/ActivityPage';
import CollectionPage from './pages/CollectionPage';
import CollectionsPage from './pages/CollectionsPage';
import DashboardPage from './pages/DashboardPage';
import DocumentPage from './pages/DocumentPage';
import HighlightsPage from './pages/HighlightsPage';
import LibraryPage from './pages/LibraryPage';
import LoginPage from './pages/LoginPage';
import NewDocumentPage from './pages/NewDocumentPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import TagsPage from './pages/TagsPage';

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<LibraryPage />} />
        <Route path="documents/new" element={<NewDocumentPage />} />
        <Route path="documents/:id" element={<DocumentPage />} />
        <Route path="highlights" element={<HighlightsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:id" element={<CollectionPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
