import { useInstallPrompt } from '../hooks/useInstallPrompt'
import './InstallButton.css'

export function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <button type="button" className="install-btn" onClick={() => void promptInstall()}>
      <span aria-hidden="true">⬇</span> Install
    </button>
  )
}
