import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Sistema/Mercados.css';

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
                    <li className='active'><Link><i class="bi bi-shop"></i> Comparar Mercados</Link></li>
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
        <header className="header-lanc">
            <div>
                <h2>Comparar Mercados</h2>
                <p className="description">Compare mercados para descobrir os melhores preços</p>
            </div>
        </header>

        <div className="select"></div>

        <div className="card search">
            <input type="text" placeholder='Pesquise o produto aqui'/>
            <i class="bi bi-search"></i>
        </div>

        <div className="mercados card">
            <table>
                <thead>
                    <tr>
                        <th>Mercado</th>
                        <th>Preços</th>
                        <th>Var. 30D</th>
                        <th>Distância</th>
                    </tr>
                </thead>

                <tbody>
                    <tr className='mais-barato'>
                        <td>Extra</td>
                        <td>R$ 4,89</td>
                        <td className='txt-primary'>8%</td>
                        <td className='description'>3,4 km</td>
                    </tr>
                    <tr>
                        <td>Extra</td>
                        <td>R$ 4,89</td>
                        <td className='txt-primary'>8%</td>
                        <td className='description'>3,4 km</td>
                    </tr>
                    <tr>
                        <td>Extra</td>
                        <td>R$ 4,89</td>
                        <td className='txt-primary'>8%</td>
                        <td className='description'>3,4 km</td>
                    </tr>
                    <tr>
                        <td>Extra</td>
                        <td>R$ 4,89</td>
                        <td className='txt-primary'>8%</td>
                        <td className='description'>3,4 km</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div className="historico card">
            <h3>Histórico de Preços</h3>
        </div>
    </div>
    </>
  )
}

export default App
