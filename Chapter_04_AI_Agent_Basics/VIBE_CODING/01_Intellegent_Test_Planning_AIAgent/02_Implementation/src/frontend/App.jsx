import React, { useState } from "react";
import MainPage from "./MainPage.jsx";
import SettingsPage from "./SettingsPage.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("main");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Jira Test Plan Generator</div>
        <nav className="tabs" aria-label="Main navigation">
          <button className={activeTab === "main" ? "tab active" : "tab"} onClick={() => setActiveTab("main")}>Main page</button>
          <button className={activeTab === "settings" ? "tab active" : "tab"} onClick={() => setActiveTab("settings")}>Settings</button>
        </nav>
      </header>
      {activeTab === "main" ? <MainPage /> : <SettingsPage />}
    </div>
  );
}
