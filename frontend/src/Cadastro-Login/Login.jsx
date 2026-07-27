import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Cadastro-Login/Cadastrar.css';

import { Link } from 'react-router-dom';


function App() {
  

  return (
    <>
    <div className="left">
            <img src={logo} alt="" />
            <div className="slogan">
              <h1>Veja onde seu dinheiro realmente vai.</h1>
              <p className="description">A Vera mostra a verdade sobre seu dinheiro - sem suavizar, sem esconder, ser jargão. Junte-se a milhares de brasileiros que já estão economizando.</p>
            </div>
            <ul>
              <small>
              <li>
                <h3 className="txt-primary">R$ 420</h3>
                <p className="description">economia média/mês</p>
              </li>
              </small>
              <small>
              <li>
                <h3 className="txt-primary">94%</h3>
                <p className="description">satisfação</p>
              </li>
              </small>
              <small>
              <li>
                <h3 className="txt-primary">2 min</h3>
                <p className="description">para configurar</p>
              </li>
              </small>
            </ul>
          </div>
    
          <div className="right">
            <div className="header">
              <h2>Bem-vindo de volta</h2>
              <p className="description">Entre na sua conta para continuar</p>
            </div>
            <form action="">
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input type="email" name='email' id='email' placeholder='Digite seu email'/>
              </div>
              <div className="form-group">
                <label htmlFor="senha">Senha</label>
                <input type="password" name='senha' id='senha' minLength={6} placeholder='Digite sua senha'/>
                <small className='esqueci-senha'><Link className='txt-primary'>Esqueci minha senha</Link></small>
              </div>
              <Link to='/dashboard'><button className="btn-primary">Entrar</button></Link>
            </form>
            <div className="ou">
                <hr />
                <p>OU</p>
                <hr />
            </div>
            <button className="btn-secondary google"><i class="bi bi-google"></i><p>Continuar com o Google</p></button>
            <small>
              <span className='description'>Não possui uma conta? </span>
              <strong><Link to='/cadastro' className='txt-primary'>Cadastrar</Link></strong>
            </small>
          </div>
      
    </>
  )
}

export default App
