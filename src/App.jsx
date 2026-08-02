import { useState } from 'react';
import rules from './data/brewing-rules.js';
import { computeRecipe, defaultPicks } from './data/brew.js';
import Worksheet from './components/Worksheet.jsx';
import RecipeCard from './components/RecipeCard.jsx';
import GrindConverter from './components/GrindConverter.jsx';
import FixTable from './components/FixTable.jsx';
import Timer from './components/Timer.jsx';
import './App.css';

export default function App() {
  const [input, setInput] = useState(rules.defaults);
  const [view, setView] = useState('worksheet');
  const [picks, setPicks] = useState(() => defaultPicks(computeRecipe(rules.defaults)));

  // computeRecipe เป็น pure และเบา คำนวณใหม่ทุก render ได้ ไม่ต้อง memo
  const recipe = computeRecipe(input);

  // เปลี่ยน input ช่องไหนก็ตาม picks รีเซ็ตกลับเป็นค่าเริ่มต้นของสูตรใหม่
  const changeInput = (field, value) => {
    const next = { ...input, [field]: value };
    setInput(next);
    setPicks(defaultPicks(computeRecipe(next)));
  };

  const changePick = (field, value) => setPicks((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">JirBrewStack</h1>
        <nav className="app__nav">
          <button
            type="button"
            aria-current={view === 'worksheet' ? 'page' : undefined}
            className={`app__nav-btn${view === 'worksheet' ? ' app__nav-btn--active' : ''}`}
            onClick={() => setView('worksheet')}
          >
            สูตร
          </button>
          <button
            type="button"
            aria-current={view === 'fix' ? 'page' : undefined}
            className={`app__nav-btn${view === 'fix' ? ' app__nav-btn--active' : ''}`}
            onClick={() => setView('fix')}
          >
            แก้รส
          </button>
        </nav>
      </header>

      <main className="app__main">
        {view === 'timer' && (
          <Timer recipe={recipe} picks={picks} onBack={() => setView('worksheet')} />
        )}
        {view === 'fix' && <FixTable device={input.device} />}
        {view === 'worksheet' && (
          <>
            <Worksheet input={input} onChange={changeInput} />
            <RecipeCard
              recipe={recipe}
              picks={picks}
              onPick={changePick}
              onStart={() => setView('timer')}
            />
            <GrindConverter />
          </>
        )}
      </main>
    </div>
  );
}
