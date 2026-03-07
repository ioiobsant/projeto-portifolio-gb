import PageIntro from '../PageIntro'

const brandPillars = [
  {
    title: 'Historia da marca',
    description: 'Apresente a trajetoria, a assinatura do atelier e o cuidado no acabamento.',
  },
  {
    title: 'Posicionamento',
    description: 'Mostre o universo de luxo, exclusividade e personalizacao do atendimento.',
  },
  {
    title: 'Diferenciais',
    description: 'Reserve espaco para materiais, processos, qualidade e atendimento consultivo.',
  },
]

function AboutScreen() {
  return (
    <div className="screen-stack">
      <PageIntro
        badge="Sobre"
        eyebrow="Identidade da marca"
        title="Uma pagina dedicada a reforcar a historia e o posicionamento do atelier."
        description="A rota de sobre pode reunir texto institucional, manifesto da marca, fotos de ambiente e outros elementos que aprofundem a conexao com o publico."
      />

      <section className="content-grid">
        {brandPillars.map((pillar) => (
          <article key={pillar.title} className="content-card">
            <h3 className="content-card__title">{pillar.title}</h3>
            <p className="content-card__copy">{pillar.description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default AboutScreen
