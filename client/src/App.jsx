import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoCall from "./VideoCall";

const App = () => (
    <Router>
        <Routes>
        
            <Route path="/" element={<VideoCall />} />
        </Routes>
    </Router>
);

export default App;
