import { createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "~/lib/useAuth";

export default function ActivityRedirect() {
  const navigate = useNavigate();
  const { user, loading, activeBlog } = useAuth();

  createEffect(() => {
    if (loading()) return;
    if (!user()) {
      navigate("/login", { replace: true });
      return;
    }
    const blog = activeBlog();
    if (blog) navigate(`/${blog.name}/activity`, { replace: true });
  });

  return null;
}
