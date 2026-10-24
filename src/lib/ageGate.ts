export const AGE_GATE_STORAGE_KEY = "bbdsmlr:age-confirmed"

export function hasConfirmedAge(): boolean {
  try {
    return localStorage.getItem(AGE_GATE_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function confirmAge(): void {
  try {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, "true")
  } catch {}
}
