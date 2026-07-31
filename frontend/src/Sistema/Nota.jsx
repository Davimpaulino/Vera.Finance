import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Sistema/Nota.css';

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
                    <li><Link><i class="bi bi-credit-card"></i> Lançamentos</Link></li>
                    <li><Link to='/categorias'><i class="bi bi-tag"></i> Categorias</Link></li>
                    <li><Link to='/relatorio'><i class="bi bi-clipboard2-data"></i> Relatório</Link></li>
                </ul>
            </div>
            <div>
                <small>Módulos Premium</small>
                <ul>
                    <li className='active'><Link><i class="bi bi-camera"></i> Nota Inteligente</Link></li>
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
        <header className="header-nota">
            <div>
                <h2>Nota Inteligente</h2>
                <p className="description">Escanei sua nota fiscal e descubra onde economizar</p>
            </div>
        </header>

        <div className="card scan">
            <i className='icon bi bi-camera'></i>
            <h3>Escaneie Sua Nota</h3>
            <p className="description">Arraste a nota fiscal aqui ou clique para escolher</p>
            <div className="btn-scan">
                <button className="btn-primary"><i class="bi bi-download"></i> Escolher Arquivo</button>
                <button className="btn-secondary"><i className='bi bi-camera'></i> Usar Câmera</button>
            </div>
            <div className="description">
                <span>JPG, PNG, PDF</span>
                <div className="circle"></div>
                <span>Máx: 10MB</span>
            </div>
        </div>

        <div className="card analise">
            <header>
                <div className='info'>
                    <div className="description">
                        <span>Carrefour</span>
                        <div className="circle"></div>
                        <span>23 de Maio</span>
                        <div className="circle"></div>
                        <span>24 Itens</span>
                    </div>
                    <h3>R$ 187,40</h3>
                </div>
                <div className="card-green">
                    <p className="txt-primary">Você poderia ter economizado</p>
                    <h3 className="txt-primary">R$ 22,40</h3>
                </div>
            </header>

            <table>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>QTD</th>
                        <th>Pago</th>
                        <th>Menor</th>
                        <th>Diferença</th>
                        <th>Onde</th>
                    </tr>
                </thead>

                <tbody>
                    <tr className='caro'>
                        <td><i class="bi bi-exclamation-triangle"></i> Leite Parmalat 1L</td>
                        <td>2</td>
                        <td>R$ 5,99</td>
                        <td>R$ 4,89</td>
                        <td className='diferenca'><i class="bi bi-arrow-up"></i> R$ 1,10</td>
                        <td>Extra</td>
                    </tr>
                    <tr className='caro'>
                        <td><i class="bi bi-exclamation-triangle"></i> Leite Parmalat 1L</td>
                        <td>2</td>
                        <td>R$ 5,99</td>
                        <td>R$ 4,89</td>
                        <td className='diferenca'><i class="bi bi-arrow-up"></i> R$ 1,10</td>
                        <td>Extra</td>
                    </tr>
                    <tr className='caro'>
                        <td><i class="bi bi-exclamation-triangle"></i> Leite Parmalat 1L</td>
                        <td>2</td>
                        <td>R$ 5,99</td>
                        <td>R$ 4,89</td>
                        <td className='diferenca'><i class="bi bi-arrow-up"></i> R$ 1,10</td>
                        <td>Extra</td>
                    </tr>
                    <tr>
                        <td><i class="bi bi-check-circle"></i> Arroz Camil 5kg</td>
                        <td>1</td>
                        <td>R$ 13,89</td>
                        <td>R$ 13,89</td>
                        <td>---</td>
                        <td>---</td>
                    </tr>
                </tbody>
            </table>
            <button className="btn-primary">Adicionar produtos com alerta à lista</button>
        </div>
    </div>
    </>
  )
}

export default App