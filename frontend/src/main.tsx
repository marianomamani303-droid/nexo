import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { socialApi } from './services/rest-social-api';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App api={socialApi} />
  </React.StrictMode>,
);
