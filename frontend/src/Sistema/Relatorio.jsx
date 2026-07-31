import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Sistema/Relatorio.css';

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
                    <li><Link to='/dashboard'><i class="bi bi-columns-gap"></i> Dashboard</Link></li>
                    <li><Link to='/lancamento'><i class="bi bi-credit-card"></i> Lançamentos</Link></li>
                    <li><Link to='/categorias'><i class="bi bi-tag"></i> Categorias</Link></li>
                    <li className='active'><Link><i class="bi bi-clipboard2-data"></i> Relatório</Link></li>
                </ul>
            </div>
            <div>
                <small>Módulos Premium</small>
                <ul>
                    <li><Link to='/nota'><i class="bi bi-camera"></i> Nota Inteligente</Link></li>
                    <li><Link to='/mercados'><i class="bi bi-shop"></i> Comparar Mercados</Link></li>
                    <li><Link to='/lista'><i class="bi bi-list-check"></i> Lista de Compras</Link></li>
                </ul>
            </div>
            <div>
                <small>Acompanhar</small>
                <ul>
                    <li><Link to='/metas'><i class="bi bi-bullseye"></i> Metas</Link></li>
                    <li><Link to='/economia'> <i class="bi bi-currency-dollar"></i> Economia Acumulada</Link></li>
                    <li><Link to='/familia'><i class="bi bi-people"></i> Modo Familia</Link></li>
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
        <header className="header-rela">
            <div>
                <h2>Relatório</h2>
                <p className="description">Maio de 2026</p>
            </div>
            <button className='btn-secondary'><i class="bi bi-filetype-pdf"></i> Exportar PDF</button>
        </header>

        <div className="card">
            <p className="description">Total Gasto</p>
            <h2>R$ 3.240,00</h2>
        </div>
        <div className="card">
            <p className="description">Maior Categoria</p>
            <h2>Mercado</h2>
            <p className="description">R$ 1.380,00</p>
        </div>
        <div className="card">
            <p className="description">Economia identificada</p>
            <h2 className='txt-primary'>R$ 124,00</h2>
        </div>
        <div className="card">
            <p className="description">Comparação com Abril</p>
            <h2><i class="bi bi-arrow-up"></i> 8%</h2>
        </div>

        <div className="card vs-mes">
            <h3>Maio VS Abril</h3>
        </div>

        <div className="card maiores-gastos">
            <h3>Top 5 Maiores Gastos</h3>
            <div className='item'>
                <div className='info'>
                    <p className="description posicao">1</p>
                    <div>
                        <h4>Pão de Açúcar</h4>
                        <p className="description">Supermercado - 11/05</p>
                    </div>
                </div>
                <h4>R$ 312,50</h4>
            </div>
            <div className='item'>
                <div className='info'>
                    <p className="description posicao">1</p>
                    <div>
                        <h4>Pão de Açúcar</h4>
                        <p className="description">Supermercado - 11/05</p>
                    </div>
                </div>
                <h4>R$ 312,50</h4>
            </div>
            <div className='item'>
                <div className='info'>
                    <p className="description posicao">1</p>
                    <div>
                        <h4>Pão de Açúcar</h4>
                        <p className="description">Supermercado - 11/05</p>
                    </div>
                </div>
                <h4>R$ 312,50</h4>
            </div>
            <div className='item'>
                <div className='info'>
                    <p className="description posicao">1</p>
                    <div>
                        <h4>Pão de Açúcar</h4>
                        <p className="description">Supermercado - 11/05</p>
                    </div>
                </div>
                <h4>R$ 312,50</h4>
            </div>
            <div className='item'>
                <div className='info'>
                    <p className="description posicao">1</p>
                    <div>
                        <h4>Pão de Açúcar</h4>
                        <p className="description">Supermercado - 11/05</p>
                    </div>
                </div>
                <h4>R$ 312,50</h4>
            </div>
        </div>
        <div className="card insights">
            <h3>Insights Automáticos</h3>
            <div className="dica">
                <i className='bi bi-arrow-down'></i>
                <p>
                    <span>Você gastou </span>
                    <span className="txt-primary">22% a menos </span>
                    <span>em restaurantes comparados ao mês passado. </span>
                    <span><b>Continue assim!</b></span>
                </p>
            </div>
            <div className="dica">
                <i className='bi bi-arrow-down'></i>
                <p>
                    <span>Você gastou </span>
                    <span className="txt-primary">22% a menos </span>
                    <span>em restaurantes comparados ao mês passado. </span>
                    <span><b>Continue assim!</b></span>
                </p>
            </div>
            <div className="dica">
                <i className='bi bi-arrow-down'></i>
                <p>
                    <span>Você gastou </span>
                    <span className="txt-primary">22% a menos </span>
                    <span>em restaurantes comparados ao mês passado. </span>
                    <span><b>Continue assim!</b></span>
                </p>
            </div>
        </div>
    </div>
    </>
  )
}

export default App