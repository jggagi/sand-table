import { GARDEN_TIMES, getGardenTime, type TimeId } from './data/garden.time';

export default function TimePanel({value,onChange}:{value:TimeId;onChange:(value:TimeId)=>void}){
  const current=getGardenTime(value);
  return <section className="time-panel" aria-label="选择园中时辰">
    <div className="time-heading">
      <p className="section-eyebrow">园中时辰</p>
      <p className="time-description" aria-live="polite" aria-atomic="true">{current.name} · {current.description}</p>
    </div>
    <div className="time-buttons" role="group" aria-label="时辰光影">
      {GARDEN_TIMES.map(time=><button key={time.id} type="button" className="time-button"
        data-testid={'time-'+time.id} aria-pressed={value===time.id} onClick={()=>onChange(time.id)}>
        <span>{time.name}</span><span className="time-mood">{time.mood}</span>
      </button>)}
    </div>
  </section>;
}
