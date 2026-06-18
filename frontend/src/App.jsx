import { useState } from 'react'
import logo from './assets/img/vera..png'
import star from './assets/icons/material-symbols_star.png'
import './Css/App.css'

function App() {
  

  return (
    <>
      <header>
        <div className="logo">
          <img className='logo-header' src={logo} alt="" />
        </div>
        <nav>
          <ul>
            <li><a href="">Calculadora</a></li>
            <li><a href="">Funcionalidades</a></li>
            <li><a href="">Preços</a></li>
          </ul>
        </nav>
        <div className="btns-header">
          <button className="btn-secondary">Login</button>
          <button className="btn-primary">Cadastrar</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="destaque">
              <span>Inteligência financeira com IA</span>
              <div className="circle"></div>
              <span> Feito para o Brasil</span>
          </div>
          <h1>
            <span>Veja onde seu dinheiro </span>
            <span className='txt-primary'>realmente</span>
            <span> vai.</span>
          </h1>
          <p className='description'>A Vera mostra a verdade do seu dinheiro - sem suavizar, sem esconder.
          Categorização automática, NF-e inteligente e metas financeiras reais</p>
          <div className="btns-hero">
            <button className="btn-primary">Descubra a verdade</button>
            <button className="btn-secondary">Calcule sua economia</button>
          </div>
          <div className="description end-hero">
            <span>Grátis pra começar </span>
            <div className="circle"></div>
            <span>Sem cartão necessário </span>
            <div className="circle"></div>
            <span>Cancele quando quiser</span>
          </div>
          
        </section>

        <section className="problema">
          <div className="assunto assunto-cancell">
            <hr />
            <p>O PROBLEMA</p>
            <hr /> 
          </div>
          <h2>
              <span>Seu dinheiro está sumindo.</span><br />
              <span className='txt-cancell'>e você nem sabe pra onde.</span>
            </h2>
            <p className="description">
              <span>Uma família brasileira de classe média perde entre</span>
              <span className='txt-cancell'> R$ 400 e R$ 1.500/mês</span>
              <span> em gastos evitáveis, não por falta de renda, por falta de verdade</span>
            </p>
            <div className="motivos">
              <div className='card'>
                <h3>R$ 1.400</h3>
                <p className="description">Dispercidados por ano no mesmo supermercado por hábito</p>
                <p className="fonte">Média IBGE 2024</p>
              </div>
              <div className='card'>
                <h3>34%</h3>
                <p className="description">Dos brasileiros não sabem para onde vai o dinheiro no fim do mês</p>
                <p className="fonte">Pesquisa SPC Brasil</p>
              </div >
              <div className='card'>
                <h3>2 em 4 pessoas</h3>
                <p className="description">Abandonam controle financeiro na segunda semana de uso</p>
                <p className="fonte">Fenômeno de fadigo do app</p>
              </div>
              <div className='card'>
                <h3>R$ 178</h3>
                <p className="description">Em gastos enviáveis por mês que você nem percebe que existem</p>
                <p className="fonte">Calculo vera baseado em NF-e</p>
              </div>
            </div>
            <div className="apps card">
              <h3>Por que outros apps não funcionam</h3>
              <span>
                <div className="app">
                  <div className="marca">M</div>
                  <p>Mobills</p>
                </div>
                <p className="description valor">R$ 19,90</p>
                <p className="description">Planilha disfarçada de app - mesma simplificação</p>
              </span>
              <span>
                <div className="app">
                  <div className="marca">O</div>
                  <p>Organize</p>
                </div>
                <p className="description valor">R$ 19,90</p>
                <p className="description">Planilha disfarçada de app - mesma simplificação</p>
              </span>
              <span>
                <div className="app">
                  <div className="marca">N</div>
                  <p>Nubank Insights</p>
                </div>
                <p className="description valor">Grátis</p>
                <p className="description">Funciona só com Nubank - sem NF-e, sem metas</p>
              </span>
              <span className='vera'>
                <div className="app">
                  <div className="marca vera-logo">V</div>
                  <p className='txt-primary'>Vera</p>
                </div>
                <p className="description valor">R$ 19,90</p>
                <p className="txt-primary">Mostra onde o dinheiro foi, onde poderia ir melhor, e o que fazer agora</p>
              </span>
            </div>
        </section>

        <section className="funcionalidades">
          <div className="assunto">
            <hr />
            <p>FUNCIONALIDADES</p>
            <hr />
          </div>

          <h2>
            <span>Tudo que você precisa</span>
            <span className="txt-primary">Nada que você não use</span>
          </h2>
          <p className="description">Quatro pilares que trabalham juntos para dar visibilidade total, otimização real e evolução consistente das suas finanças</p>

          <div className="funcoes">
            <div className='mot1'>
              <div className="texto">
                <div className="destaque">
                  <span>Visibilidade</span>
                </div>
                <h3>Onde cada real foi parar</h3>
                <p className="description">Categorização automática e granular de todos os gastos. Veja cada centavo - por produto, estabelecimento, categoria, período e forma de pagamento. Com drilldown completo.</p>
              </div>
            </div>
            <div className="card card1">
              <div>
                <div className='titulo'>
                  <p className="description">Supermercado</p>
                  <p className="valor">R$ 892</p>
                </div>
                <div className="progress">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
              </div>
              <div>
                <div className='titulo'>
                  <p className="description">Lazer</p>
                  <p className="valor">R$ 500</p>
                </div>
                <div className="progress pro2">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
              </div>
              <div>
                <div className='titulo'>
                  <p className="description">Transporte</p>
                  <p className="valor">R$ 762</p>
                </div>
                <div className="progress pro3">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
              </div>
              <div>
                <div className='titulo'>
                  <p className="description">Desejos</p>
                  <p className="valor">R$ 294</p>
                </div>
                <div className="progress pro4">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
              </div>
            </div>

            <div className="card card2">
              <span className="item">
                <p className="description">Leite Integral</p>
                <p className="valor">R$ 5,49</p>
                <div className="destaque">Melhor preço</div>
              </span>
              <span className="item">
                <p className="description">Arroz Camil 5kg</p>
                <p className="valor">R$ 6, 58</p>
                <div className="destaque">Melhor preço</div>
              </span>
              <span className="item">
                <p className="description">Coca Cola</p>
                <p className="valor">R$ 7,99</p>
                <div className="destaque">Melhor preço</div>
              </span>
              <span className="item">
                <p className="description">Miojo</p>
                <p className="valor">R$ 2,39</p>
                <div className="destaque">Melhor preço</div>
              </span>
            </div>
            <div className="mot2">
              <div className="destaque">
                NF-e inteligente
              </div>
              <h3>Escaneie a nota. Vera cuida do resto</h3>
              <p className="description">Fotografe a nota fiscal e a IA extrai cada produto automaticamente. Cruza com preços da região e mostra quanto você economizaria comprando no mercado certo</p>
            </div>

            <div className="mot3">
              <div className="destaque">Metas</div>
              <h3>Transforme controle em crescimento</h3>
              <p className="description">Metas financeiras com acompanhamento em tempo real, alertas inteligentes e simulação de impacto. A vera mostra de onde cortar para sua meta ficar possível.</p>
            </div>
            <div className="card card3">
              <div className='item'>
                <div className='titulo'>
                  <p className="description">Reserva de emergência</p>
                  <p className="valor">R$ 762</p>
                </div>
                <div className="progress pro">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
                <div className="valor">
                  <p className="description">R$ 4.200</p>
                  <p className="description">R$ 15.000</p>
                </div>
              </div>
              <div className='item'>
                <div className='titulo'>
                  <p className="description">Reserva de emergência</p>
                  <p className="valor">R$ 762</p>
                </div>
                <div className="progress pro">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
                <div className="valor">
                  <p className="description">R$ 4.200</p>
                  <p className="description">R$ 15.000</p>
                </div>
              </div>
              <div className='item'>
                <div className='titulo'>
                  <p className="description">Reserva de emergência</p>
                  <p className="valor">R$ 762</p>
                </div>
                <div className="progress pro">
                  <div className="total"></div>
                  <div className="feito"></div>
                </div>
                <div className="valor">
                  <p className="description">R$ 4.200</p>
                  <p className="description">R$ 15.000</p>
                </div>
              </div>
            </div>

            <div className="card4 card">
              <span>
                <div className="mercado">
                  <h3>Extra</h3>
                  <div className="destaque">
                    <small>Mais Barato</small>
                  </div>
                </div>
                <p className="valor">R$ 4,89</p>
                <p className='txt-primary porcentagem'>8%</p>
                <p className="description">3,4 km</p>
              </span>
              <span>
                <div className="mercado">
                  <h3>atacadão</h3>
                </div>
                <p className="valor">R$ 5,20</p>
                <p className='porcentagem'>0%</p>
                <p className="description">5,2 km</p>
              </span>
              <span>
                <div className="mercado">
                  <h3>Pão de açucar</h3>
                  <div className="destaque"><small>Mais próximo</small></div>
                </div>
                <p className="valor">R4 5,49</p>
                <p className="txt-cancell porcentagem">2%</p>
                <p className="description">1,8 km</p>
              </span>
              <span>
                <div className="mercado">
                  <h3>carrefour</h3>
                </div>
                <p className="valor">R$ 5,99</p>
                <p className="txt-cancell porcentagem">5%</p>
                <p className="description">2,1 km</p>
              </span>
            </div>
            <div className="mot4">
              <div className="destaque">
                preços
              </div>
              <h3>Monitore preço dos produtos perto de você</h3>
              <p className="description">Acompanhe o preço de produtos nos mercados do seu raio, para garantir que você economize o máximo possível.</p>
            </div>
          </div>
          <p className="description">Conecta com +300 bancos e fintechs brasileiras</p>
          <div className="description">
              <span>Nubank</span>
              <div className="circle"></div>
              <span>Itaú</span>
              <div className="circle"></div>
              <span>Bradesco</span>
              <div className="circle"></div>
              <span>C6 bank</span>
              <div className="circle"></div>
              <span>Inter</span>
              <div className="circle"></div>
              <span>XP</span>
              <div className="circle"></div>
              <span>BTG</span>
          </div>
        </section>

        <section className="depoimentos">
          <div className="assunto">
            <hr />
            <p>Depoimentos</p>
            <hr />
          </div>
          <h2>O que os usuários dizem</h2>
          <div className="usuarios">

            <div className="card">
              <div className="stars">
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                </div>
              <p>No terceiro mês, pela primeira vez na vida, guardei R$400. A vera me mostrou que eu gastava R$200/mês em delivery sem perceber.</p>
              <div className="user">
                <div className="foto">RA</div>
                <div className="nome">
                  <p>Rafaela Alves</p>
                  <small><p className="description">Analista de marketing</p></small>
                </div>
                <p className="economia">
                  <small><span className="description">Economizando:</span></small>
                  <br />
                  <span className="txt-primary">R$ 428/mês</span>
                </p>
              </div>
            </div>

            <div className="card">
              <div className="stars">
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                </div>
              <p>No terceiro mês, pela primeira vez na vida, guardei R$400. A vera me mostrou que eu gastava R$200/mês em delivery sem perceber.</p>
              <div className="user">
                  <div className="foto">RA</div>
                  <div className="nome">
                    <p>Rafaela Alves</p>
                    <small><p className="description">Analista de marketing</p></small>
                  </div>
                <p className="economia">
                  <small><span className="description">Economizando:</span></small>
                  <br />
                  <span className="txt-primary">R$ 428/mês</span>
                </p>
             </div>
            </div> 

            <div className="card">
              <div className="stars">
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                <img src={star} alt="" />
                </div>
              <p>No terceiro mês, pela primeira vez na vida, guardei R$400. A vera me mostrou que eu gastava R$200/mês em delivery sem perceber.</p>
              <div className="user">
                <div className="foto">RA</div>
                <div className="nome">
                  <p>Rafaela Alves</p>
                  <small><p className="description">Analista de marketing</p></small>
                </div>
                <p className="economia">
                  <small><span className="description">Economizando:</span></small>
                  <br />
                  <span className="txt-primary">R$ 428/mês</span>
                </p>
             </div>
            </div>
          </div>
        </section>


        <section className="sec-planos">
          <div className="assunto">
            <hr />
            <p>PLANOS</p>
            <hr />
          </div>
          <h2>
            <span>A </span>
            <span><img className='logo-planos' src={logo} alt="" /></span>
            <span> Se paga em dia</span>
          </h2>
          <p className="description">A economia média dos nossos usuários é de R$ 420/mês. O plano básico custa menos que um delivery</p>
          
          <div className="planos">
            <div className="basico card">
              <h3>Básico</h3>
              <p className="description">Para conhecer a vera</p>
              <h3 className="valor">R$ 19,90</h3>
              <button>Começar agora</button>
              <ul>
                <li>Máx de 40 transações/mês</li>
                <li>Sem modo família</li>
                <li>3 categorias</li>
                <li>Limite de 3 NF-e</li>
                <li>Limite de 2 metas</li>
                <li>Até 10 produtos na lista de compras</li>
                <li>Funcões limitadas</li>
              </ul>
            </div>
            <div className="pro card">
              <h3>Pro</h3>
              <p className="description">Começe a economizar melhor</p>
              <h3 className="valor">R$ 49,90</h3>
              <button>Começar agora</button>
              <ul>
                <li>Até 5 bancos</li>
                <li>3 pessoas na família</li>
                <li>10 categorias</li>
                <li>50 NF-e</li>
                <li>Limite de 10 Metas</li>
                <li>Sem limite na lista de compras</li>
                <li>Acompanhação parcial de mercados</li>
              </ul>
            </div>
            <div className="premium card">
              <h3>PREMIUM</h3>
              <p className="description">Conte conosco pra tudo</p>
              <h3 className="valor">R$ 99,90</h3>
              <button className="btn-primary">Começar agora</button>
              <ul>
                <li>Sem limites de bancos</li>
                <li>10 membros na família</li>
                <li>Número ilimitado de categorias</li>
                <li>Sem limite de NF-e</li>
                <li>Metas ilimitadas</li>
                <li>Lista de compras ilimitadas</li>
                <li>Acompanhamento completo de mercados</li>
              </ul>
            </div>
          </div>
          <p className="description">1 mês com 50% de desconto - Cancele quando quiser</p>

        </section>

        <section className="comece">
          <p className="txt-primary">Pronto pra começar</p>
          <h2>Descubra hoje a verdade sobre seu dinheiro.</h2>
          <p className="description">Grátis para sempre no plano Free, 15 dias grátis na primeira assinatua em qualquer plano</p>
          <button className="btn-primary">Começar agora - é grátis</button>
        </section>
      </main>

      <footer>
        <div>
          <img src={logo} alt="" />
          <p>A verdade sobre seu dinheiro</p>
          <p className="txt-primary">BAIXAR O APP</p>
        </div>
        <div>
          <ul>
            <li><a href="">Termos de uso</a></li>
            <li><a href="">Políticas de privacidade</a></li>
            <li><a href="">Sobre a empresa</a></li>
          </ul>
        </div>
        <div>
          <ul>
            <li><a href="">Home</a></li>
            <li><a href="">Cadastro</a></li>
            <li><a href="">Login</a></li>
          </ul>
        </div>
        <div>
          <ul>
            <li><a href="">Facebook</a></li>
            <li><a href="">Instagram</a></li>
            <li><a href="">WhatsApp</a></li>
          </ul>
        </div>
      </footer>
    </>
  )
}

export default App
