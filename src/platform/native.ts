import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { StatusBar, Style } from '@capacitor/status-bar'

export const isNativeApp = (): boolean => Capacitor.isNativePlatform()

export const isNativeIosApp = (): boolean => Capacitor.getPlatform() === 'ios'

export const configureNativeAppChrome = async (): Promise<void> => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('native-app', isNativeApp())
  }

  if (!isNativeIosApp()) {
    return
  }

  await StatusBar.setOverlaysWebView({ overlay: false })
  await StatusBar.setStyle({ style: Style.Dark })
}

export const shareNativeLink = async (options: { title: string; text: string; url: string }): Promise<boolean> => {
  if (!isNativeApp()) {
    return false
  }

  const { value } = await Share.canShare()
  if (!value) {
    return false
  }

  await Share.share(options)
  return true
}
