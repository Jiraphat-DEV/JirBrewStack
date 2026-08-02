import rules from '../data/brewing-rules.js';
import { formatTime, COARSE_NOTE } from '../data/brew.js';
import './RecipeCard.css';

const oneDecimal = (v) => v.toFixed(1);

// field ที่ตั้งค่าจริงบนอุปกรณ์ได้มี slider ทุกตัว ค่าที่เป็นเป้าหมายหรือผลลัพธ์ไม่มี
const SLIDERS = {
  aeropress: [
    { field: 'temp', label: 'อุณหภูมิน้ำ', format: (v) => `${v} องศา` },
    { field: 'grind', label: 'เบอร์บด (Mavo)', format: oneDecimal },
    { field: 'steep', label: 'เวลาแช่', format: formatTime },
    { field: 'bypass', label: 'bypass (น้ำร้อน)', format: (v) => `${v} g` },
  ],
  delter: [
    { field: 'temp', label: 'อุณหภูมิน้ำ', format: (v) => `${v} องศา` },
    { field: 'grind', label: 'เบอร์บด (Mavo)', format: oneDecimal },
    { field: 'preinfusionWait', label: 'รอหลัง pre-infusion', format: formatTime },
    { field: 'pressSpeed', label: 'ความเร็วกดต่อจังหวะ', format: formatTime },
    { field: 'restBetween', label: 'พักระหว่างจังหวะ', format: formatTime },
    { field: 'bypass', label: 'bypass (น้ำอุณหภูมิห้อง)', format: (v) => `${v} g` },
  ],
};

function Fact({ label, value, note }) {
  return (
    <div>
      <div className="recipe__fact-label">{label}</div>
      <div className="recipe__fact-value">{value}</div>
      {note && <div className="recipe__fact-note">{note}</div>}
    </div>
  );
}

function RangeSlider({ label, format, value, range, bounds, onChange }) {
  const pct = (v) => ((v - bounds.min) / (bounds.max - bounds.min)) * 100;
  const hint =
    range[0] === range[1] ? `แนะนำ ${format(range[0])}` : `แนะนำ ${format(range[0])} ถึง ${format(range[1])}`;
  return (
    <div>
      <div className="recipe__slider-head">
        <span className="recipe__slider-label">{label}</span>
        <span className="recipe__slider-value">{format(value)}</span>
      </div>
      <input
        type="range"
        className="recipe__slider"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        aria-label={label}
        aria-valuetext={format(value)}
        style={{ '--band-start': `${pct(range[0])}%`, '--band-end': `${pct(range[1])}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="recipe__slider-hint">{hint}</div>
    </div>
  );
}

export default function RecipeCard({ recipe, picks, onPick, onStart }) {
  const bounds = rules[recipe.device].sliderBounds;
  const ratioFinal = `1:${recipe.ratioFinal[0].toFixed(1)} ถึง 1:${recipe.ratioFinal[1].toFixed(1)}`;
  // ต้องคำนวณจาก picks.bypass (ค่าที่เลื่อนจริง) ไม่ใช่ recipe.ratioFinal ซึ่งมาจากช่วง bypass ที่แนะนำเท่านั้น
  // slider bypass กว้างกว่าช่วงแนะนำโดยตั้งใจ (ดูตารางแก้รส) ratioFinal เพียงอย่างเดียวจึงตามค่าจริงที่เลือกไม่ทัน
  const ratioLive = (recipe.water + picks.bypass) / recipe.dose;

  return (
    <section className="recipe">
      <div className="recipe__facts">
        <Fact label="กาแฟ" value={`${recipe.dose} g`} />
        <Fact
          label="น้ำ"
          value={`${recipe.water} g`}
          note={`1:${recipe.ratioConcentrate.toFixed(1)} ของน้ำที่เทเข้า`}
        />
        {recipe.yield && (
          <Fact
            label="น้ำกาแฟที่ได้"
            value={`~${recipe.yield} g`}
            note={recipe.yieldNote}
          />
        )}
        <Fact
          label="อุณหภูมิตอนดื่ม"
          value={`${recipe.drinkTemp[0]}-${recipe.drinkTemp[1]} องศา`}
        />
      </div>

      {SLIDERS[recipe.device].map(({ field, label, format }) => (
        <RangeSlider
          key={field}
          label={label}
          format={format}
          value={picks[field]}
          range={recipe[field]}
          bounds={bounds[field]}
          onChange={(v) => onPick(field, v)}
        />
      ))}

      <div className="recipe__statics">
        <span>
          ratio ตอนนี้ (ตาม bypass ที่เลื่อนไว้): <strong className="recipe__ratio-live">1:{ratioLive.toFixed(1)}</strong>
        </span>
        <span>ช่วงแนะนำ {ratioFinal} (ของน้ำที่เทเข้า ไม่ใช่ปริมาณน้ำในถ้วย)</span>
        <span>ฟิลเตอร์: {recipe.filter}</span>
        {recipe.bloom && <span>{recipe.bloom}</span>}
        {recipe.strokes && <span>แบ่งกด {recipe.strokes} จังหวะ</span>}
      </div>

      {recipe.notes.length > 0 && (
        <div className="recipe__notes">
          {recipe.notes.map((note) => (
            <span
              key={note}
              className={note === COARSE_NOTE ? 'recipe__note--warning' : undefined}
            >
              {note}
            </span>
          ))}
        </div>
      )}

      <button type="button" className="recipe__start" onClick={onStart}>
        เริ่มชง
      </button>
    </section>
  );
}
