import { Navigate, useSearchParams } from "@solidjs/router";

export default function SearchRedirect() {
  const [params] = useSearchParams();
  const q = typeof params.q === "string" ? params.q : "";
  const isBlogs = params.type === "blogs";

  let href = "/home";
  if (isBlogs) {
    href = q ? `/blog-search?q=${encodeURIComponent(q)}` : "/blog-search";
  } else if (q) {
    href = `/home?tag_name=${encodeURIComponent(q)}`;
  }

  return <Navigate href={href} />;
}
