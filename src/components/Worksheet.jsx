import rules from '../data/brewing-rules.js';
import './Worksheet.css';

// เรียงตามลำดับขั้น 1-4 ใน worksheet โดยมีเครื่องอยู่บนสุด
const GROUPS = [
  { field: 'device', label: 'เครื่อง' },
  { field: 'roast', label: 'ระดับคั่ว' },
  { field: 'process', label: 'Process' },
  { field: 'altitude', label: 'ความสูง (masl)' },
  { field: 'origin', label: 'แหล่งปลูก' },
];

export default function Worksheet({ input, onChange }) {
  return (
    <section className="worksheet">
      {GROUPS.map(({ field, label }) => (
        <div key={field}>
          <h2 className="worksheet__label">{label}</h2>
          <div className="worksheet__options">
            {rules.options[field].map((option) => {
              const active = input[field] === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={active}
                  className={`worksheet__option${active ? ' worksheet__option--active' : ''}`}
                  onClick={() => onChange(field, option.key)}
                >
                  <span>{option.label}</span>
                  {option.hint && <span className="worksheet__option-hint">{option.hint}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
