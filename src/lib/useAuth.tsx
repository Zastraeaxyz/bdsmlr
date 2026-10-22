import { createContext, createSignal, createEffect, useContext, onCleanup, type ParentProps } from "solid-js"
import { getCurrentUser, setCurrentUser, login as apiLogin, type AuthUser } from "./api"
import { fetchAllFollowingIds, setCachedFollowingIds, clearCachedFollowingIds } from "./following"
import { clearPostInteractions } from "./postInteractions"
import { webLogin, webLogout } from "./messages"
import { activeBlogId, setActiveBlogId, clearActiveBlogId } from "./activeBlog"

interface AuthBlog {
  id: number
  name: string
}

interface AuthContextType {
  user: () => AuthUser | null
  loading: () => boolean
  blogs: () => AuthBlog[]
  activeBlogId: () => number | null
  activeBlog: () => AuthBlog | null
  setActiveBlog: (id: number) => void
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>()

export function AuthProvider(props: ParentProps) {
  const [user, setUser] = createSignal<AuthUser | null>(getCurrentUser())
  const [loading, setLoading] = createSignal(true)

  let cancelled = false
  onCleanup(() => { cancelled = true })

  createEffect(() => {
    let u = user()
    if (!u) {
      try {
        const stored = localStorage.getItem("user")
        if (stored) {
          u = JSON.parse(stored)
          setCurrentUser(u)
          setUser(u)
        }
      } catch {}
    }
    if (u) {
      const list = u.blogs ?? []
      const stored = activeBlogId()
      const valid = stored != null && list.some((blog) => blog.id === stored)
      if (!valid) {
        const fallback =
          u.primary_blog_id ?? u.blog_id ?? list[0]?.id ?? null
        if (!stored || !valid) setActiveBlogId(fallback)
      }
    }
    if (!cancelled) setLoading(false)
  })

  const blogs = (): AuthBlog[] => {
    const u = user()
    if (!u) return []
    const list = (u.blogs ?? []).map((blog) => ({ id: blog.id, name: blog.name }))
    if (list.length === 0 && u.blog_id && u.blog_name) {
      return [{ id: u.blog_id, name: u.blog_name }]
    }
    return list
  }

  const activeBlog = (): AuthBlog | null => {
    const id = activeBlogId()
    return blogs().find((blog) => blog.id === id) ?? null
  }

  const refreshFollowing = (blogId: number) => {
    fetchAllFollowingIds(blogId)
      .then((ids) => setCachedFollowingIds(ids, blogId))
      .catch(() => {})
  }

  const setActiveBlog = (id: number) => {
    const choice = blogs().find((blog) => blog.id === id)
    if (!choice) return
    setActiveBlogId(choice.id)
    clearPostInteractions()
    refreshFollowing(choice.id)
  }

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password, true)
    try {
      await webLogin(u.email ?? email, password)
    } catch (err) {
      console.warn("Could not start BDSMLR message session", err)
    }
    setCurrentUser(u)
    localStorage.setItem("user", JSON.stringify(u))
    setUser(u)
    const primary = u.primary_blog_id ?? u.blog_id ?? u.blogs?.[0]?.id ?? null
    setActiveBlogId(primary)
    if (primary) refreshFollowing(primary)
    return u
  }

  const logout = () => {
    void webLogout()
    setCurrentUser(null)
    localStorage.removeItem("user")
    clearCachedFollowingIds()
    clearActiveBlogId()
    clearPostInteractions()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        blogs,
        activeBlogId,
        activeBlog,
        setActiveBlog,
        login,
        logout,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
