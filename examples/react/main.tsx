import React from "https://cdn.esm.sh/react";
import ReactDOM from "https://cdn.esm.sh/react-dom";

function App() {
  return <div>Hello React on Swdev with swc 3</div>;
}

export default () => {
  ReactDOM.render(<App />, document.querySelector(".root"));
};
