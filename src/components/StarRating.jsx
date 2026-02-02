import './StarRating.css';

export function StarRating({ value, onChange, label }) {
  return (
    <div className="star-rating">
      <div className="star-rating__header">
        <span className="star-rating__label">{label}</span>
      </div>
      <div className="star-rating__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-rating__star ${
              value >= star ? 'star-rating__star--filled' : ''
            }`}
            onClick={() => onChange(star)}
            aria-label={`Rate ${star} of 5 stars`}
          >
            {value >= star ? '\u2605' : '\u2606'}
          </button>
        ))}
      </div>
    </div>
  );
}
