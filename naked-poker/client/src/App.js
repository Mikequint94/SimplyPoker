import React from 'react';
import { BrowserRouter as Router, Route } from "react-router-dom"
import Home from "./Home"
import Room from "./Room"

const App = () => {  
  
  return (
      <Router>
          <Route path='/' exact component={Home} />
          <Route path='/:roomId' component={Room} />
      </Router>
  )
}

export default App;
