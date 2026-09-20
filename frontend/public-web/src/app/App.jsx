import HomePage from '../features/home/HomePage.jsx'
import Catalog from '../features/catalog/Catalog.jsx'
import Popup from '../features/catalog/Popup.jsx'
export default function App(){return <>{['/tours','/promotions'].includes(location.pathname)?<Catalog/>:<HomePage/>}<Popup/></>}
