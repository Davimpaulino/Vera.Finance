import { createRoot } from 'react-dom/client';
import './src/css/index.css';
import { PhonePainel, PhoneComparar, PhonesLista } from './src/components/site/Phones.jsx';
createRoot(document.getElementById('root')).render(
  <div className="cap">
    <PhonePainel />
    <PhoneComparar />
    <PhonesLista />
  </div>
);
