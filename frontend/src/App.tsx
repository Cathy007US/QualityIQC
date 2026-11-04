import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicLayout } from './components/PublicLayout'
import { ScrollToTop } from './components/ScrollToTop'
import { ToastProvider } from './components/Toast'
import { I18nProvider } from './i18n/I18nContext'
import { DocumentDetailPage } from './pages/DocumentDetailPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { CategoriesPage } from './pages/admin/CategoriesPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { DocumentsAdminPage } from './pages/admin/DocumentsAdminPage'
import { UploadPage } from './pages/admin/UploadPage'

function RootRedirect() {
  const saved = localStorage.getItem('iqc_locale')
  return <Navigate to={saved === 'en-US' ? '/en' : '/zh'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<RootRedirect />} />

              <Route path="/:lang" element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="documents/:id" element={<DocumentDetailPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              <Route path="login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="documents" element={<DocumentsAdminPage />} />
                  <Route path="upload" element={<UploadPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/zh" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
