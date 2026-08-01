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

        <div className="lista card">
            <header>
                <h3>Minha Lista</h3>
                <div className="description">
                    <span>6 Itens</span>
                    <div className="circle"></div>
                    <span>0 Comprados</span>
                </div>
            </header>
            <div className="add">
                    <input type="text" placeholder='Adicionar Produto'/>
                    <button className="btn-primary">+</button>
            </div>

            <div className="produtos">
                <div className="item">
                    <div className="info">
                        <input type="checkbox" />
                        <h4>Leite Parmalat 1L</h4>
                    </div>
                   <div className="actions">
                        <button className="transp">-</button>
                        <span>2</span>
                        <button className="transp">+</button>
                        <button className="transp"><i class="bi bi-trash3"></i></button>
                   </div>
                </div>
                <div className="item">
                    <div className="info">
                        <input type="checkbox" />
                        <h4>Leite Parmalat 1L</h4>
                    </div>
                   <div className="actions">
                        <button className="transp">-</button>
                        <span>2</span>
                        <button className="transp">+</button>
                        <button className="transp"><i class="bi bi-trash3"></i></button>
                   </div>
                </div>
                <div className="item">
                    <div className="info">
                        <input type="checkbox" />
                        <h4>Leite Parmalat 1L</h4>
                    </div>
                   <div className="actions">
                        <button className="transp">-</button>
                        <span>2</span>
                        <button className="transp">+</button>
                        <button className="transp"><i class="bi bi-trash3"></i></button>
                   </div>
                </div>
                <div className="item">
                    <div className="info">
                        <input type="checkbox" />
                        <h4>Leite Parmalat 1L</h4>
                    </div>
                   <div className="actions">
                        <button className="transp">-</button>
                        <span>2</span>
                        <button className="transp">+</button>
                        <button className="transp"><i class="bi bi-trash3"></i></button>
                   </div>
                </div>
                <div className="item">
                    <div className="info">
                        <input type="checkbox" />
                        <h4>Leite Parmalat 1L</h4>
                    </div>
                   <div className="actions">
                        <button className="transp">-</button>
                        <span>2</span>
                        <button className="transp">+</button>
                        <button className="transp"><i class="bi bi-trash3"></i></button>
                   </div>
                </div>
                <div className="item">
                    <div className="info">
                        <input type="checkbox" />
                        <h4>Leite Parmalat 1L</h4>
                    </div>
                   <div className="actions">
                        <button className="transp">-</button>
                        <span>2</span>
                        <button className="transp">+</button>
                        <button className="transp"><i class="bi bi-trash3"></i></button>
                   </div>
                </div>
            </div>
        </div>

        <div className="card ranking">
            <h3>Onde comprar mais barato?</h3>
            <div className="mercado">
                <div className="info">
                    <span className='description'>1</span>
                    <span>Extra</span>
                </div>
                <div className="valor">
                    <span>R$ 87,40</span>
                    <span className="txt-primary"><small>Mais Barato</small></span>
                </div>
            </div>
            <div className="mercado">
                <div className="info">
                    <span className='description'>2</span>
                    <span>atacadão</span>
                </div>
                <div className="valor">
                    <span>R$ 94,20</span>
                    <span className="description"><small>+R$ 6,80</small></span>
                </div>
            </div>
            <div className="mercado">
                <div className="info">
                    <span className='description'>2</span>
                    <span>atacadão</span>
                </div>
                <div className="valor">
                    <span>R$ 94,20</span>
                    <span className="description"><small>+R$ 6,80</small></span>
                </div>
            </div>
                <div className="mercado">
                    <div className="info">
                        <span className='description'>2</span>
                        <span>atacadão</span>
                    </div>
                    <div className="valor">
                        <span>R$ 94,20</span>
                        <span className="description"><small>+R$ 6,80</small></span>
                    </div>
                </div>
        </div>

        <div className="dica card">
            <i class="bi bi-lightbulb-fill"></i>
            <p>
                <span>Comprando a carne no atacadão e o restante no Extra, você </span>
                <span className="txt-primary">economiza R$ 11,20 </span>
                <span>vs comprar tudo em um lugar</span>
            </p>
        </div>
        
        <button className="btn-secondary"><i class="bi bi-share"></i> Compartilhar Lista</button>
    </div>
    </>
  )
}

export default App