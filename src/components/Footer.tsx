import './Footer.css'

export function Footer() {
  return (
    <footer className="app-footer">
      {/* The app, not the author. A byline is the wrong thing to end a tool
          with — the name now sits in the About sheet, where someone who wants
          to know who made this is actually looking. */}
      <p className="app-footer__text">
        <span className="app-footer__mark dev">लेख</span> Lekh · v{__APP_VERSION__}
      </p>
    </footer>
  )
}
