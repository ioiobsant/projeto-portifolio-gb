import { Link } from 'react-router-dom'
import PageIntro from '../PageIntro'

function NotFoundScreen() {
  return (
    <div className="screen-stack">
      <PageIntro
        badge="404"
        eyebrow="Rota invalida"
        title="A pagina que voce tentou acessar nao foi encontrada."
        description="A estrutura do app continua funcionando normalmente. Use a navegacao principal ou retorne para a home para continuar."
      >
        <div className="info-card">
          <p className="info-card__label">Navegacao</p>
          <Link to="/" className="page-link">
            Voltar para o inicio
          </Link>
        </div>
      </PageIntro>
    </div>
  )
}

export default NotFoundScreen
