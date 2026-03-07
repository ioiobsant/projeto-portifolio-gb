import type { ReactNode } from 'react'

type PageIntroProps = {
  badge: string
  title: string
  description: string
  eyebrow?: string
  children?: ReactNode
}

function PageIntro({
  badge,
  title,
  description,
  eyebrow,
  children,
}: PageIntroProps) {
  return (
    <section className="page-section">
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="page-badge">{badge}</span>
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h2 className="page-heading">{title}</h2>
          <p className="page-copy">{description}</p>
        </div>

        {children ? <div className="page-hero__aside">{children}</div> : null}
      </div>
    </section>
  )
}

export default PageIntro
