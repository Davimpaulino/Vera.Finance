import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx' // Supondo que sua Landing Page está aqui no App.jsx
import Cadastro from './Cadastro-Login/Cadastro.jsx' // Ajuste o nome correto da sua pasta aqui
import Login from './Cadastro-Login/Login.jsx'
import Dashboard from './Sistema/Dashboard.jsx'
import Lancamentos from './Sistema/Lancamentos.jsx'
import Categorias from './Sistema/Categorias.jsx'
import Relatorio from './Sistema/Relatorio.jsx'
import Nota from './Sistema/Nota.jsx'
import Mercados from './Sistema/Mercados.jsx'
import Lista from './Sistema/Lista.jsx'
import Metas from './Sistema/Metas.jsx'
import Economia from './Sistema/Economia.jsx'
import './Css/index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // Página inicial / Landing Page
  },
  {
    path: "/cadastro",
    element: <Cadastro />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />
  },
  {
    path: '/lancamento',
    element: <Lancamentos/>
  },
  {
    path: '/categorias',
    element: <Categorias/>
  },
  {
    path: '/relatorio',
    element: <Relatorio/>
  },
  {
    path:'/nota',
    element: <Nota/>
  },
  {
    path: '/mercados',
    element: <Mercados/>
  },
  {
    path: '/lista',
    element: <Lista/>
  },
  {
    path: '/metas',
    element: <Metas/>
  },
  {
    path: '/economia',
    element: <Economia/>
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
