import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Sistema/Dashboard.css';

import { Link } from 'react-router-dom';


function App() {
  

  return (
    <>
    <aside>
        <img src={logo} alt="" />
        <nav>
            <div>
                <small>Menu Principal</small>
                <ul>
                    <li><Link to=''><i class="bi bi-columns-gap"></i> Dashboard</Link></li>
                    <li><Link to=''><i class="bi bi-credit-card"></i> Lançamentos</Link></li>
                    <li><Link to=''><i class="bi bi-tag"></i> Categorias</Link></li>
                    <li><Link to=''><i class="bi bi-clipboard2-data"></i> Relatório</Link></li>
                </ul>
            </div>
            <div>
                <small>Módulos Premium</small>
                <ul>
                    <li><Link to=''><i class="bi bi-camera"></i> Nota Inteligênte</Link></li>
                    <li><Link to=''><i class="bi bi-shop"></i> Comparar Mercados</Link></li>
                    <li><Link to=''><i class="bi bi-list-check"></i> Lista de Compras</Link></li>
                </ul>
            </div>
            <div>
                <small>Acompanhar</small>
                <ul>
                    <li><Link to=''><i class="bi bi-bullseye"></i> Metas</Link></li>
                    <li><Link to=''><i class="bi bi-graph-up"></i> Histórico de Perços</Link></li>
                    <li><Link to=''> <i class="bi bi-currency-dollar"></i> Economia Acumulada</Link></li>
                    <li><Link to=''><i class="bi bi-people"></i> Modo Familia</Link></li>
                </ul>
            </div>
        </nav>
        <div className="end-nav">
            <div className="usuario">
                <div className="foto">D</div>
                <div>
                    <h3>Davi Paulino</h3>
                    <small className='txt-primary'>Master</small>
                </div>
            </div>
            <Link to=''><i class="bi bi-gear"></i> Configurações</Link>
        </div>
    </aside>

    <div className="sistema">
        <header className='header-dash'>
            <div>
                <h2>Olá, Davi Paulino</h2>
                <p className="description">Aqui está o seu resumo do mês</p>
            </div>
            <div className="btn-primary btn-mes">
                <button id='left' className='left'><i class="bi bi-chevron-left"></i></button>
                <p id="mes" className='mes'>Maio</p>
                <button className="right" id="right"><i class="bi bi-chevron-right"></i></button>
            </div>
        </header>

        <div className="econo-mes card-green">
            <div className='txt'>
                <p className="txt-primary"><strong>Economia identificada este mês</strong></p>
                <h1 className="txt-primary">R$ 124,00</h1>
                <p className="description">Você comprou no mercado mais caro 3 vezes este mês.</p>
            </div>
            <Link className="txt-primary"><b>Ver comparação <i class="bi bi-arrow-right"></i></b></Link>
        </div>

        <div className="card">
            <p className="description">Gasto em Maio</p>
            <h2>R$ 3.240,00</h2>
            <p className="description"><i class="bi bi-arrow-up"></i> 8% vs Abril</p>
        </div>
        <div className="card">
            <p className="description">Meta Mensal</p>
            <h2>R$ 4.000,00</h2>
            <progress className='progress-meta' value='70' max='100'></progress>
            <p className="description">R$ 760,00 ainda disponíveis</p>
        </div>
        <div className="card">
            <p className="description">Economizado Mensal</p>
            <h2 className='txt-primary'>R$ 847,00</h2>
            <p>
                <span className="txt-primary">Desde que usa o </span><strong>Vera<span className='txt-primary'>.</span></strong></p>
        </div>
        <div className="card">
            <p className="description">Notas Analisadas</p>
            <h2>12</h2>
            <p className="description">3 este mês</p>
        </div>

        <div className="card gastos-cat">
            <h3>Gastos por Categoria</h3>
        </div>
        <div className="card alertas">
            <h3>Alertas Recentes</h3>
            <div className="item">
                <i class="bi bi-exclamation-triangle"></i>
                <div className="noticia">
                    <p>Leite integral 18% mais caro no carrefour</p>
                    <p className="description">Há 2h</p>
                </div>
            </div>
            <div className="item">
                <i class="bi bi-exclamation-circle"></i>
                <div className="noticia">
                    <p>Restaurantes 12% acima da média</p>
                    <p className="description">Há 1 dia</p>
                </div>
            </div>
            <div className="item">
                <i class="bi bi-check-circle"></i>
                <div className="noticia">
                    <p>Conta de luz dentro do orçamento</p>
                    <p className="description">Há 2 dias</p>
                </div>
            </div>
            <div className="item">
                <i class="bi bi-exclamation-triangle"></i>
                <div className="noticia">
                    <p>Detergente R$ 2,40 mais caro no Extra</p>
                    <p className="description">Há 4 dias</p>
                </div>
            </div>
            <Link className='description'>Ver todos <i class="bi bi-arrow-right"></i></Link>
        </div>

        <div className="card ultimos-lanc">
            <h3>Últimos Lançamentos</h3>
        </div>
    </div>
    </>
  )
}

export default App
