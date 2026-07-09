 
import Error404 from "./Pages/404Page";
import BuyCredits from "./Pages/BuyCredits";
import LandingPage from "./Pages/LandingPage";
import { BrowserRouter, Routes, Route, } from "react-router-dom";

 function App () {

 return(
  <BrowserRouter>
   <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="*" element={<Error404 />} />
        <Route path="/buy-credits" element={<BuyCredits/>} />
    </Routes>
  </BrowserRouter>
 )
}


export default App