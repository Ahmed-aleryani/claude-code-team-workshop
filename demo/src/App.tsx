import { Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/header';
import { LoginPage } from './components/login-page';
import { RegisterPage } from './components/register-page';
import { RequireAuth } from './components/require-auth';
import { TodoPage } from './components/todo-page';

export function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <TodoPage />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
