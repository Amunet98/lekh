import './Footer.css'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <p className="app-footer__text">
        © {year} Bimesh Poudel · v{__APP_VERSION__}
      </p>
    </footer>
  )
}
