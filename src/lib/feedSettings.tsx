import { createContext, useContext, type ParentProps } from 'solid-js'

interface FeedSettingsContextType {
  hideRepeatingImages: () => boolean
  setHideRepeatingImages: (value: boolean | ((prev: boolean) => boolean)) => void
}

const FeedSettingsContext = createContext<FeedSettingsContextType>()

interface FeedSettingsProviderProps extends ParentProps {
  hideRepeatingImages: () => boolean
  setHideRepeatingImages: (value: boolean | ((prev: boolean) => boolean)) => void
}

export function FeedSettingsProvider(props: FeedSettingsProviderProps) {
  return (
    <FeedSettingsContext.Provider
      value={{
        hideRepeatingImages: props.hideRepeatingImages,
        setHideRepeatingImages: props.setHideRepeatingImages,
      }}
    >
      {props.children}
    </FeedSettingsContext.Provider>
  )
}

export function useFeedSettings(): FeedSettingsContextType {
  const ctx = useContext(FeedSettingsContext)
  if (!ctx) {
    throw new Error('useFeedSettings must be used within a FeedSettingsProvider')
  }
  return ctx
}
