// The invitations list lives at `/api/invitations` itself. A catch-all file
// (`[...path].ts`) only matches paths with at least one segment after it, so
// the bare path needs its own entry point to share the same handlers.
export { GET, POST } from "./[...path]";
