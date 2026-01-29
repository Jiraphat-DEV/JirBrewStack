import { getGrindClicks } from '../data/recipes';
import './GrindDisplay.css';

export function GrindDisplay({ method, cups }) {
  const grindInfo = getGrindClicks(method, cups);

  return (
    <div className="grind-display">
      <div className="grind-display__header">
        <span className="grind-display__label">Timemore C2 Grind</span>
      </div>
      <div className="grind-display__content">
        <div className="grind-display__clicks">
          <span className="grind-display__clicks-number">{grindInfo.clicks}</span>
          <span className="grind-display__clicks-unit">clicks</span>
        </div>
        <div className="grind-display__note">{grindInfo.note}</div>
      </div>
    </div>
  );
}
