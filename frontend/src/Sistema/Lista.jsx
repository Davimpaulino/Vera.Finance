import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Sistema/Lista.css';

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
                    <li><Link to='/relatorio'><i class="bi bi-clipboard2-data"></i> Relatório</Link></li>
                </ul>
            </div>
            <div>
                <small>Módulos Premium</small>
                <ul>
                    <li><Link to='/nota'><i class="bi bi-camera"></i> Nota Inteligente</Link></li>
                    <li><Link to='/mercados'><i class="bi bi-shop"></i> Comparar Mercados</Link></li>
                    <li className='active'><Link><i class="bi bi-list-check"></i> Lista de Compras</Link></li>
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
                <h2>Lista de Compras Inteligente</h2>
                <p className="description">Sabemos onde tudo está mais barato</p>
            </div>
        </header>
    </div>
    </>
  )
}

export default App