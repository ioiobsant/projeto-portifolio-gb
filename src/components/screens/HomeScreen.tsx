import { Link } from 'react-router-dom'
import PageIntro from '../PageIntro'

const highlights = [
  {
    title: 'Catalogo digital',
    description: 'Organize colecoes, destaque produtos e facilite a apresentacao do atelier.',
  },
  {
    title: 'Experiencia premium',
    description: 'Crie uma navegacao elegante para refletir a identidade da marca.',
  },
  {
    title: 'Base pronta para crescer',
    description: 'Acrescente novas secoes sem precisar reorganizar o roteamento.',
  },
]

function HomeScreen() {
  return (
    <div className="screen-stack">
      <PageIntro
        badge="Home"
        eyebrow="Genice Brandao Atelier"
        title="Uma base inicial para apresentar o atelier com elegancia."
        description="A tela inicial pode servir como vitrine principal, reunindo identidade, destaques e atalhos para as secoes mais importantes do aplicativo."
      >
        <div className="info-card">
          <p className="info-card__label">Acesso rapido</p>
          <div className="action-group">
            <Link to="/catalogo" className="page-link">
              Ver catalogo
            </Link>
            <Link to="/contato" className="page-link page-link--secondary">
              Falar com o atelier
            </Link>
          </div>
        </div>
      </PageIntro>

      <section className="content-grid">
        {highlights.map((item) => (
          <article key={item.title} className="content-card">
            <h3 className="content-card__title">{item.title}</h3>
            <p className="content-card__copy">{item.description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default HomeScreen
