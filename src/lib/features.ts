function enabled(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const features = {
  legacyAccountSettings: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_ACCOUNT_SETTINGS,
  ),
  legacyBlogCustomization: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_BLOG_CUSTOMIZATION,
  ),
  legacyAsks: enabled(import.meta.env.VITE_FEATURE_LEGACY_ASKS),
  legacySubmissions: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_SUBMISSIONS,
  ),
  legacyAdvancedSettings: enabled(
    import.meta.env.VITE_FEATURE_LEGACY_ADVANCED_SETTINGS,
  ),
  forYou: enabled(import.meta.env.VITE_FEATURE_FOR_YOU),
} as const;
