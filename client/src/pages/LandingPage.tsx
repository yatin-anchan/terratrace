import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: Particle[] = []
    const COLORS = ['#e8c87a', '#c0a050', '#ffffff', '#7a9ee8', '#4a7ec8']

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.6 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(232,200,122,${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
        ctx.globalAlpha = 1
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.particleCanvas} />
}

const STATS = [
  { num: '247+', label: 'Operations Run' },
  { num: '94%', label: 'Locate Rate' },
  { num: '3-Layer', label: 'Search Engine' },
  { num: '<2min', label: 'Sim Time' },
]

const FEATURES = [
  {
    icon: '◈',
    title: 'Multi-Agent Simulation',
    desc: 'Hundreds of AI agents simulate subject movement across real terrain, weather, and behavioral profiles to generate probability heatmaps.',
  },
  {
    icon: '◎',
    title: 'Evidence Intelligence',
    desc: 'Ingest witness sightings, mobile pings, drone imagery, and field observations. Each piece of evidence updates search probabilities in real time.',
  },
  {
    icon: '◉',
    title: 'Geospatial Operations',
    desc: '3D terrain, contour lines, vegetation, traffic, and satellite layers. Draw sectors, place basecamps, and manage POIs directly on the map.',
  },
  {
    icon: '◆',
    title: 'AI Assistant',
    desc: 'Ask why a sector is prioritized. Get search-party briefings. Generate incident reports. The AI explains every recommendation in plain language.',
  },
  {
    icon: '◇',
    title: 'Live Weather Integration',
    desc: 'Real-time and historical weather from Open-Meteo. Wind, precipitation, visibility, and temperature all feed into movement modeling.',
  },
  {
    icon: '◈',
    title: 'Full Audit Trail',
    desc: 'Every action is logged with timestamp, user, before/after values, and reason. Complete operational accountability from start to close.',
  },
]

const ENVIRONMENTS = [
  { label: 'FOREST', desc: 'Dense canopy, trail networks, elevation' },
  { label: 'URBAN', desc: 'CCTV zones, road networks, buildings' },
  { label: 'COASTAL', desc: 'Shoreline, tidal influence, boat launches' },
  { label: 'HIGHLAND', desc: 'Steep terrain, exposure, limited trails' },
  { label: 'RURAL', desc: 'Open fields, farms, scattered settlements' },
]

const ROLES = [
  { role: 'Incident Commander', desc: 'Full operational control, simulation, team management' },
  { role: 'Search Coordinator', desc: 'Sector assignment, evidence review, AI recommendations' },
  { role: 'Field Team Leader', desc: 'View assigned sectors, log findings, add evidence' },
  { role: 'Analyst', desc: 'Simulation comparison, heatmap analysis, reporting' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const sectionsRef = useRef<Record<string, HTMLElement>>({})

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible((v) => ({ ...v, [e.target.id]: true }))
          }
        })
      },
      { threshold: 0.15 }
    )
    Object.values(sectionsRef.current).forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const reg = (id: string) => (el: HTMLElement | null) => {
    if (el) sectionsRef.current[id] = el
  }

  const isVisible = (id: string) => visible[id] ?? false

  return (
    <div className={styles.page}>
      {/* Particle background */}
      <ParticleCanvas />

      {/* Fixed noise overlay */}
      <div className={styles.noise} />

      {/* NAV */}
      <nav className={`${styles.nav} ${scrollY > 40 ? styles.navScrolled : ''}`}>
        <div className={styles.navBrand}>TERRA<span>TRACE</span></div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#environments">Environments</a>
          <a href="#roles">Roles</a>
          <a href="#how">How It Works</a>
        </div>
        <div className={styles.navActions}>
          <button className={styles.navLogin} onClick={() => navigate('/login')}>Login</button>
          <button className={styles.navCta} onClick={() => navigate('/login')}>Launch Platform →</button>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />

        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          LIVE OPERATIONS PLATFORM
        </div>

        <h1 className={styles.heroTitle}>
          <span className={styles.heroTitleLine1}>SEARCH &amp;</span>
          <span className={styles.heroTitleLine2}>RESCUE</span>
          <span className={styles.heroTitleLine3}>INTELLIGENCE</span>
        </h1>

        <p className={styles.heroDesc}>
          AI-assisted geospatial operations for missing-person search across
          urban, rural, forest and coastal environments. Evidence-driven.
          Simulation-powered. Explainable.
        </p>

        <div className={styles.heroActions}>
          <button className={styles.heroCta} onClick={() => navigate('/login')}>
            Launch Operations
            <span className={styles.heroCtaArrow}>→</span>
          </button>
          <button className={styles.heroSecondary}>View Demo</button>
        </div>

        <div className={styles.heroStats}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.heroStat}>
              <span className={styles.heroStatNum}>{s.num}</span>
              <span className={styles.heroStatLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.heroScroll}>
          <div className={styles.heroScrollLine} />
          <span>SCROLL</span>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        ref={reg('features')}
        className={`${styles.section} ${isVisible('features') ? styles.sectionVisible : ''}`}
      >
        <div className={styles.sectionInner}>
          <div className={styles.sectionTag}>CAPABILITIES</div>
          <h2 className={styles.sectionTitle}>
            Everything a search operation needs
          </h2>
          <p className={styles.sectionDesc}>
            Six core capabilities working together as a single adaptive search engine.
          </p>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={styles.featureCard}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENVIRONMENTS */}
      <section
        id="environments"
        ref={reg('environments')}
        className={`${styles.section} ${styles.sectionAlt} ${isVisible('environments') ? styles.sectionVisible : ''}`}
      >
        <div className={styles.sectionInner}>
          <div className={styles.sectionTag}>TERRAIN COVERAGE</div>
          <h2 className={styles.sectionTitle}>Built for every environment</h2>
          <div className={styles.envList}>
            {ENVIRONMENTS.map((e, i) => (
              <div
                key={e.label}
                className={styles.envRow}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={styles.envNum}>0{i + 1}</div>
                <div className={styles.envLabel}>{e.label}</div>
                <div className={styles.envDesc}>{e.desc}</div>
                <div className={styles.envLine} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        ref={reg('how')}
        className={`${styles.section} ${isVisible('how') ? styles.sectionVisible : ''}`}
      >
        <div className={styles.sectionInner}>
          <div className={styles.sectionTag}>PROCESS</div>
          <h2 className={styles.sectionTitle}>How TerraTrace works</h2>
          <div className={styles.howSteps}>
            {[
              { n: '01', t: 'Create Operation', d: 'Define your search area, terrain, radius, and operational timeline. Assign teams and set up basecamps.' },
              { n: '02', t: 'Profile Subjects', d: 'Enter subject details — age, fitness, experience, intent, last known location, and contact time.' },
              { n: '03', t: 'Ingest Evidence', d: 'Add witness sightings, mobile pings, drone footage, field observations with confidence scores.' },
              { n: '04', t: 'Run Simulation', d: 'Multi-agent engine spawns hundreds of virtual subjects across real terrain, weather, and behavioral models.' },
              { n: '05', t: 'Deploy Teams', d: 'Ranked sectors guide where to search first. AI explains why each area is prioritized.' },
              { n: '06', t: 'Adapt Continuously', d: 'Field results feed back in. Probabilities update. The system learns as the operation evolves.' },
            ].map((s, i) => (
              <div
                key={s.n}
                className={styles.howStep}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={styles.howStepNum}>{s.n}</div>
                <div className={styles.howStepContent}>
                  <h3 className={styles.howStepTitle}>{s.t}</h3>
                  <p className={styles.howStepDesc}>{s.d}</p>
                </div>
                {i < 5 && <div className={styles.howStepConnector} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section
        id="roles"
        ref={reg('roles')}
        className={`${styles.section} ${styles.sectionAlt} ${isVisible('roles') ? styles.sectionVisible : ''}`}
      >
        <div className={styles.sectionInner}>
          <div className={styles.sectionTag}>ACCESS CONTROL</div>
          <h2 className={styles.sectionTitle}>Role-based platform access</h2>
          <div className={styles.rolesGrid}>
            {ROLES.map((r, i) => (
              <div
                key={r.role}
                className={styles.roleCard}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={styles.roleNum}>0{i + 1}</div>
                <h3 className={styles.roleTitle}>{r.role}</h3>
                <p className={styles.roleDesc}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={reg('cta')}
        id="cta"
        className={`${styles.section} ${styles.ctaSection} ${isVisible('cta') ? styles.sectionVisible : ''}`}
      >
        <div className={styles.ctaGlow} />
        <div className={styles.sectionInner} style={{ textAlign: 'center' }}>
          <div className={styles.sectionTag}>GET STARTED</div>
          <h2 className={styles.ctaTitle}>
            Ready to run your first operation?
          </h2>
          <p className={styles.ctaDesc}>
            Set up in minutes. No training required. Built for coordinators, not engineers.
          </p>
          <button className={styles.ctaBtn} onClick={() => navigate('/login')}>
            Launch TerraTrace →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>TERRA<span>TRACE</span></div>
        <p className={styles.footerSub}>AI-Assisted Search &amp; Rescue Intelligence Platform</p>
        <p className={styles.footerNote}>
          Built for incident commanders, search coordinators, field teams, and analysts.
        </p>
        <div className={styles.footerLine} />
        <p className={styles.footerCopy}>© 2025 TerraTrace · All operations are logged and audited.</p>
      </footer>
    </div>
  )
}