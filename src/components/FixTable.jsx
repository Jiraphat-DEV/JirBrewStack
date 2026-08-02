import rules from '../data/brewing-rules.js';
import './FixTable.css';

export default function FixTable({ device }) {
  return (
    <section className="fix">
      <p className="fix__caption">
        ข้อที่บอกให้เพิ่มกาแฟ ต้องชั่งเอง แอปล็อกโดสไว้ที่ค่าตั้งต้น ไม่ได้ปรับให้
      </p>
      <p className="fix__intro">
        <span className="fix__intro-badge">{rules[device].label}</span>
        <span className="fix__intro-desc">ทำทีละข้อ ชิมทุกครั้ง หยุดเมื่อดีขึ้น</span>
      </p>
      {rules.fixes[device].map((fix) => (
        <article className="fix__card" key={fix.symptom}>
          <h2 className="fix__symptom">{fix.symptom}</h2>
          <ol className="fix__steps">
            {fix.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
