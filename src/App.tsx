import "./App.css";
import AzureSpeech from "./components/azure/Azure";
import Klleon from "./components/Klleon/Klleon";

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
