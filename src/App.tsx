import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AppProvider } from "./store/AppContext";
import { ToastProvider } from "./components/base/Toast";

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter basename={__BASE_PATH__}>
            <AppRoutes />
          </BrowserRouter>
        </I18nextProvider>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;