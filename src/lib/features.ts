function enabled(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const features = {
  legacyCompose: enabled(import.meta.env.VITE_FEATURE_LEGACY_COMPOSE),
  legacyDrafts: enabled(import.meta.env.VITE_FEATURE_LEGACY_DRAFTS),
  legacyAccountSettings: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_ACCOUNT_SETTINGS,
  ),
  legacyBlogCustomization: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_BLOG_CUSTOMIZATION,
  ),
  legacyQueue: enabled(import.meta.env.VITE_FEATURE_LEGACY_QUEUE),
  legacyAsks: enabled(import.meta.env.VITE_FEATURE_LEGACY_ASKS),
  legacySubmissions: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_SUBMISSIONS,
  ),
  legacyAdvancedSettings: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_ADVANCED_SETTINGS,
  ),
  postEditing: enabled(import.meta.env.VITE_FEATURE_POST_EDITING),
  forYou: enabled(import.meta.env.VITE_FEATURE_FOR_YOU),
} as const;
