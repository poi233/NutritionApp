
export const fallbackLng = 'en'
export const languages = [fallbackLng, 'zh-CN']
export const defaultNS = 'translation'

export function getOptions () {
  return {
    // debug: true,
    supportedLngs: languages,
    fallbackLng,
    defaultNS,
    // Disabling localeDetection is advised
    // because it can cause unexpected behavior
    localeDetection: false
  }
}

    