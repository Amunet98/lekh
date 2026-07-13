import { ROADMAP } from '../data/roadmap'
import './Roadmap.css'

export function Roadmap() {
  return (
    <section className="roadmap">
      <span className="tag">Roadmap</span>
      <h2>Where this goes</h2>
      <ul className="stages">
        {ROADMAP.map((stage) => (
          <li key={stage.name} className={stage.now ? 'now' : undefined}>
            <span className="st-name">
              {stage.name}
              {stage.now && <em>← this build</em>}
            </span>
            <p>{stage.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
