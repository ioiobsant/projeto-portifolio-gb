import PageIntro from '../PageIntro'

const contactChannels = [
  {
    title: 'Atendimento personalizado',
    description: 'Espaco para WhatsApp, telefone e horario de atendimento.',
  },
  {
    title: 'Endereco e showroom',
    description: 'Reserve a area para mapa, endereco e referencias de visita.',
  },
  {
    title: 'Redes sociais',
    description: 'Inclua links para Instagram e outros canais de relacionamento.',
  },
]

function ContactScreen() {
  return (
    <div className="screen-stack">
      <PageIntro
        badge="Contato"
        eyebrow="Relacionamento"
        title="Uma tela pronta para concentrar os canais de contato do atelier."
        description="Aqui voce pode adicionar formulario, botoes de acao rapida e informacoes que ajudem o cliente a iniciar o atendimento com facilidade."
      >
        <div className="info-card">
          <p className="info-card__label">Sugestao</p>
          <p className="info-card__copy">
            Priorize canais diretos, como WhatsApp e Instagram, para acelerar o primeiro
            contato.
          </p>
        </div>
      </PageIntro>

      <section className="content-grid">
        {contactChannels.map((channel) => (
          <article key={channel.title} className="content-card">
            <h3 className="content-card__title">{channel.title}</h3>
            <p className="content-card__copy">{channel.description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default ContactScreen
