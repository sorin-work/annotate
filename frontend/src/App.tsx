import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import Layout from './components/Layout';
import LibraryPage from './pages/LibraryPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

// The library and sign-in load with the app; every other page is its own chunk.
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DocumentPage = lazy(() => import('./pages/DocumentPage'));
const HighlightsPage = lazy(() => import('./pages/HighlightsPage'));
const NewDocumentPage = lazy(() => import('./pages/NewDocumentPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));

export default function App() {
  return (
    <Suspense fallback={null}>
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
          <Route path="*" element={<NotFoundPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
