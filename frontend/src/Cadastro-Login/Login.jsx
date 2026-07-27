import { useState } from 'react'
import logo from '../assets/img/vera..png'
import '../Css/Cadastro-Login/Cadastrar.css';

import { Link, useNavigate } from 'react-router-dom';
import { use } from 'react';



function App() {
  
  const [Email, setEmail] = useState('');
  const [PassWord, setPassword] = useState('')

  const navigate = useNavigate()

  const EmailCerto = 'davi.paulino@etec.com'
  const SenhaCerta = 'vera.ia'

  const Validacao = (e) => {
    e.preventDefault();

    if (Email===EmailCerto && PassWord===SenhaCerta){
      navigate('/dashboard')
    }
  }

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
            <form onClick={Validacao}>
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input type="email" value={Email} 
                onChange={(e) => setEmail(e.target.value)}  
                name='email' id='email' placeholder='Digite seu email' required/>
              </div>
              <div className="form-group">
                <label htmlFor="senha">Senha</label>
                <input type="password"
                value={PassWord} 
                onChange={(e) => setPassword(e.target.value)}
                name='senha' id='senha' minLength={6} placeholder='Digite sua senha' required/>
                <small className='esqueci-senha'><Link className='txt-primary'>Esqueci minha senha</Link></small>
              </div>
              <button type='submit' className="btn-primary">Entrar</button>
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
