'use client';

const times = Array.from({ length: 33 }, (_, index) => {
  const hours = String(8 + Math.floor(index / 4)).padStart(2, '0');
  const minutes = String((index % 4) * 15).padStart(2, '0');
  return hours + ':' + minutes;
});

export default function ViewingTimeSelect(props) {
  return (
    <select {...props}>
      <option value="">Select time</option>
      {times.map(time => <option key={time} value={time}>{time}</option>)}
    </select>
  );
}
