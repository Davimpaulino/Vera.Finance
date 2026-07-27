import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx' // Supondo que sua Landing Page está aqui no App.jsx
import Cadastro from './Cadastro-Login/Cadastro.jsx' // Ajuste o nome correto da sua pasta aqui
import Login from './Cadastro-Login/Login.jsx'
import Dashboard from './Sistema/Dashboard.jsx'
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
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
