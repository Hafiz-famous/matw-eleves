import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Spinner } from "./components/Spinner";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";

// L'interface de discussion (Markdown, etc.) est chargée à la demande.
const ChatPage = lazy(() => import("./pages/ChatPage"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-white text-electric-500">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/chat/:conversationId?" element={<ChatPage />} />
        </Route>
        <Route path="/login" element={<Navigate to="/connexion" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
