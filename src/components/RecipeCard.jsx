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

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

// แถวไหนไม่ส่ง label มา ค่าจะกินเต็มความกว้างเอง (:only-child ใน CSS) สำหรับข้อความยาวที่ไม่ใช่คู่ label-value
function InfoRow({ label, children }) {
  return (
    <div className="recipe__info-row">
      {label && <span className="recipe__info-label">{label}</span>}
      <span className="recipe__info-value">{children}</span>
    </div>
  );
}

function RangeSlider({ label, format, value, range, bounds, onChange }) {
  const pct = (v) => ((v - bounds.min) / (bounds.max - bounds.min)) * 100;
  const hint =
    range[0] === range[1] ? `แนะนำ ${format(range[0])}` : `แนะนำ ${format(range[0])} ถึง ${format(range[1])}`;
  // slider หลายตัวเลื่อนได้กว้างกว่าช่วงแนะนำโดยตั้งใจ (ไว้แก้รสตามตาราง) เลยต้องบอกด้วยสีว่าตอนนี้ออกนอกช่วงแล้ว
  const outside = value < range[0] || value > range[1];
  return (
    <div>
      <div className="recipe__slider-head">
        <span className="recipe__slider-label">
          {label}
          <span className="recipe__slider-hint">{hint}</span>
        </span>
        <span className={`recipe__slider-value${outside ? ' recipe__slider-value--outside' : ''}`}>
          {format(value)}
        </span>
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
      <div className="stats">
        <Stat label="กาแฟ" value={`${recipe.dose} g`} />
        <Stat label="น้ำ" value={`${recipe.water} g`} />
        {recipe.yield && <Stat label="น้ำกาแฟที่ได้" value={`~${recipe.yield} g`} />}
        <Stat label="ตอนดื่ม" value={`${recipe.drinkTemp[0]}-${recipe.drinkTemp[1]}°`} />
      </div>

      <div className="recipe__sliders">
        <h2 className="recipe__section-title">ค่าที่จะตั้งบนเครื่อง</h2>
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
      </div>

      <div className="recipe__info">
        <InfoRow label="ratio ตอนนี้">
          <strong className="recipe__ratio-live">1:{ratioLive.toFixed(1)}</strong>{' '}
          <span className="recipe__info-sub">ตาม bypass ที่เลื่อนไว้</span>
        </InfoRow>
        <InfoRow label="ช่วงแนะนำ">
          {ratioFinal}{' '}
          <span className="recipe__info-sub">(ของน้ำที่เทเข้า ไม่ใช่ปริมาณน้ำในถ้วย)</span>
        </InfoRow>
        <InfoRow label="ก่อน bypass">1:{recipe.ratioConcentrate.toFixed(1)} ของน้ำที่เทเข้า</InfoRow>
        <InfoRow label="ฟิลเตอร์">{recipe.filter}</InfoRow>
        {recipe.bloom && <InfoRow label="bloom">{recipe.bloom}</InfoRow>}
        {recipe.strokes && <InfoRow label="จังหวะกด">แบ่งกด {recipe.strokes} จังหวะ</InfoRow>}
        {recipe.yieldNote && <InfoRow>{recipe.yieldNote}</InfoRow>}
      </div>

      {recipe.notes.length > 0 && (
        <ul className="recipe__notes">
          {recipe.notes.map((note) => (
            <li
              key={note}
              className={`recipe__note${note === COARSE_NOTE ? ' recipe__note--warning' : ''}`}
            >
              {note}
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="recipe__start" onClick={onStart}>
        เริ่มชง
      </button>
    </section>
  );
}
