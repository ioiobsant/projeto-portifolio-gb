import PageIntro from '../PageIntro'

const catalogSections = [
  'Lancamentos e destaques',
  'Sofas, poltronas e cabeceiras',
  'Filtros por colecao, tecido ou acabamento',
  'Cards com imagem, descricao e link para detalhe',
]

function CatalogScreen() {
  return (
    <div className="screen-stack">
      <PageIntro
        badge="Catalogo"
        eyebrow="Colecoes e produtos"
        title="Estrutura inicial para a exibicao do catalogo."
        description="Esta tela foi preparada para receber listagens de produtos, filtros e futuras paginas de detalhe sem exigir mudancas grandes na organizacao do projeto."
      >
        <div className="info-card">
          <p className="info-card__label">Proxima evolucao</p>
          <p className="info-card__copy">
            Adicionar cards conectados a dados reais e rotas dinamicas para cada produto.
          </p>
        </div>
      </PageIntro>

      <section className="content-grid">
        {catalogSections.map((section) => (
          <article key={section} className="content-card">
            <h3 className="content-card__title">{section}</h3>
            <p className="content-card__copy">
              Espaco reservado para encaixar a interface correspondente dessa secao.
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default CatalogScreen
