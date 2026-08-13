import './Footer.css'

/* A footer again, for one link.
 *
 * The previous one was deleted in 1.3.1 and deserved to be — it carried a
 * version number that nobody reads under a typing app, and the version moved to
 * the About sheet where someone asking that question actually looks.
 *
 * A privacy policy is the opposite case. It has to be findable without knowing
 * it exists, and a store listing points at it, so burying it behind a control
 * you have to press is exactly wrong. Hence one line, one link, and nothing
 * else — anything more and this drifts back into being the thing that was
 * removed.
 */
export function Footer() {
  return (
    <footer className="footer">
      <a href="/privacy.html">privacy</a>
    </footer>
  )
}
