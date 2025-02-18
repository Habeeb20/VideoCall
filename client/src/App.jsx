import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoCall from "./VideoCall";

const App = () => (
    <Router>
        <Routes>
            <Route path="/" element={<h2>Welcome to Video Call App</h2>} />
            <Route path="/call" element={<VideoCall />} />
        </Routes>
    </Router>
);

export default App;
