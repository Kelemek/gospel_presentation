export const INFO_PAGE_WEB_URL = 'https://thegospelpresentation.cp-church.org'

export const INFO_PAGE_APP_STORE_URL =
  'https://apps.apple.com/us/app/the-gospel-presentation/id6759943826'

export const INFO_PAGE_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=org.cpchurch.gospelpresentation'

export const INFO_PAGE_LINKS = [
  {
    id: 'web' as const,
    label: 'Website',
    shortUrl: 'thegospelpresentation.cp-church.org',
    href: INFO_PAGE_WEB_URL,
  },
  {
    id: 'appStore' as const,
    label: 'App Store',
    shortUrl: 'App Store: The Gospel Presentation',
    href: INFO_PAGE_APP_STORE_URL,
  },
  {
    id: 'playStore' as const,
    label: 'Google Play',
    shortUrl: 'Play: The Gospel Presentation',
    href: INFO_PAGE_PLAY_STORE_URL,
  },
] as const
