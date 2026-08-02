import rules from '../data/brewing-rules.js';
import './Worksheet.css';

// device แยกออกมาอยู่นอก <details> เพราะเป็นตัวแยกสูตรใหญ่สุด ต้องเห็นและสลับได้ตลอดโดยไม่ต้องกางอะไร
// อีก 4 ตัวเป็นคุณสมบัติของเมล็ด ตั้งครั้งเดียวต่อถุง เลยยุบเก็บไว้ใต้แถบสรุปได้
// useHint: ใช้ hint แทน label ตอนสรุป เพราะ "กลาง" อ่านแล้วไม่รู้เรื่อง แต่ "1,200-1,800" รู้
const BEAN_GROUPS = [
  { field: 'roast', label: 'ระดับคั่ว', cols: 3 },
  { field: 'process', label: 'Process', cols: 2 },
  { field: 'altitude', label: 'ความสูง (masl)', cols: 3, useHint: true },
  { field: 'origin', label: 'แหล่งปลูก', cols: 2 },
];

const optionOf = (field, key) => rules.options[field].find((o) => o.key === key);

export default function Worksheet({ input, onChange }) {
  const summary = BEAN_GROUPS.map(({ field, useHint }) => {
    const option = optionOf(field, input[field]);
    return (useHint && option.hint) || option.label;
  }).join(' · ');

  return (
    <section className="worksheet">
      <div className="worksheet__devices" role="group" aria-label="เครื่อง">
        {rules.options.device.map((option) => {
          const active = input.device === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              className={`worksheet__device${active ? ' worksheet__device--active' : ''}`}
              onClick={() => onChange('device', option.key)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <details className="worksheet__bean">
        <summary className="worksheet__summary">
          <span className="worksheet__summary-text">
            <span className="worksheet__summary-label">เมล็ด</span>
            <span className="worksheet__summary-value">{summary}</span>
          </span>
          <span className="worksheet__summary-toggle" aria-hidden="true">
            แก้<span className="worksheet__chevron">⌄</span>
          </span>
        </summary>

        <div className="worksheet__groups">
          {BEAN_GROUPS.map(({ field, label, cols }) => (
            <div key={field}>
              <h2 className="worksheet__label" id={`worksheet-${field}`}>
                {label}
              </h2>
              <div
                className="worksheet__options"
                role="group"
                aria-labelledby={`worksheet-${field}`}
                style={{ '--cols': cols }}
              >
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
        </div>
      </details>
    </section>
  );
}
