import { BrowserRouter } from 'react-router-dom';
import AllRoutes from './Router';
import AiBotWidget from './Component/AiBot/AiBotWidget';

function App() {
  return (
    <div className='md:w-auto md:h-auto'>
        <BrowserRouter>
          <AllRoutes/>
          <AiBotWidget />
        </BrowserRouter>
    </div>
  );
}

export default App;
