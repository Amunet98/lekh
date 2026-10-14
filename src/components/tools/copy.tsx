import { useToast } from '../../hooks/useToast'
import { tick } from '../../lib/haptics'

function useCopy() {
  const toast = useToast()
  return async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      tick()
      toast.done(`Copied ${what}`)
    } catch {
      toast.problem('Could not copy — select the text and copy it instead')
    }
  }
}

export function CopyButton({ text, what }: { text: string; what: string }) {
  const copy = useCopy()
  return (
    <button
      type="button"
      className="btn tools__copy"
      aria-label={`Copy ${what}`}
      onClick={() => void copy(text, what)}
    >
      Copy
    </button>
  )
}
