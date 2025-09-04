import "./App.css";
import AzureSpeech from "./components/azure/Azure";
import Klleon from "./components/klleon/Klleon";

function App() {
  return (
    <>
      <div style={{ display: "flex" }}>
        <Klleon />
        <AzureSpeech />
      </div>
    </>
  );
}

export default App;
