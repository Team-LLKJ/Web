import "./App.css";
import "./components/ui/ui.css";
import "./components/ui/tabs-arrows.css";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router/AppRoutes";
import { AuthProvider } from "./auth/AuthProvider";
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
