import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { AuthProvider } from "~/lib/useAuth";
import { Analytics } from "~/components/Analytics";
import { AppErrorBoundary } from "~/components/AppErrorBoundary";
import "./index.css";

export default function App() {
  return (
    <Router
      root={props => (
        <AuthProvider>
          <MetaProvider>
            <Analytics />
            <AppErrorBoundary>
              <Suspense>{props.children}</Suspense>
            </AppErrorBoundary>
          </MetaProvider>
        </AuthProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
