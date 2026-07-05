 
import Error404 from "./Pages/404Page";
import LandingPage from "./Pages/LandingPage";
import { BrowserRouter, Routes, Route, } from "react-router-dom";

 function App () {

 return(
  <BrowserRouter>
   <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="*" element={<Error404 />} />
    </Routes>
  </BrowserRouter>
 )
}


export default App