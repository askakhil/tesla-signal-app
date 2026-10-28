const groups = [
  {
    category: "While Driving",
    items: [
      { name: "Signal Predictor", href: "/", tag: "Live now", desc: "Learns traffic signal cycles from GPS drives and predicts the countdown to green." },
      { name: "Vintage Speedometer", href: "/apps/speedometer", tag: "Beta — Test", desc: "GPS analog dial, mph/km-h toggle, trip distance and top speed." },
      { name: "Eco Driving Score", href: "/apps/eco-driving-score", tag: "Beta — Test", desc: "GPS session score 0–100 from smooth acceleration, braking and speed steadiness." },
      { name: "Commute ETA Learner", href: "/apps/commute-eta-learner", tag: "Beta — Test", desc: "Logs commutes, learns average duration by route and time of day, predicts ETA." },
      { name: "Break Timer for Long Drives", href: "/apps/break-timer", tag: "Beta — Test", desc: "Countdown to your next break, break timer, and a break-due alert." },
    ],
  },
  {
    category: "Trip & Charging",
    items: [
      { name: "Charge + Trip Tracker", href: "/apps/charge-trip-tracker", tag: "Beta — Test", desc: "Manual charge log with kWh, cost and trip miles, plus totals and cost per mile." },
      { name: "Road-trip / Charger Planner", href: "/apps/roadtrip-charger-planner", tag: "Beta — Test", desc: "Enter distance and range, estimate charger stops, add real chargers, save the plan." },
      { name: "Golden Hour Finder", href: "/apps/golden-hour", tag: "Beta — Test", desc: "Sunrise, sunset and golden hours, plus 3D car orientation with sun and sunset direction reactive to car direction." },
    ],
  },
  {
    category: "Parking & Car Care",
    items: [
      { name: "Parking Spot Saver", href: "/apps/parking-spot-saver", tag: "Beta — Test", desc: "Save your GPS parking spot, then get distance and compass direction back to your car." },
      { name: "Maintenance Log", href: "/apps/maintenance-log", tag: "Beta — Test", desc: "Log services by date, type, mileage and cost, with upcoming reminders." },
      { name: "Lease / Mileage Tracker", href: "/apps/lease-mileage-tracker", tag: "Beta — Test", desc: "Lease pace, daily budget and projected end mileage. Data stays in your browser only." },
    ],
  },
];

export default function Apps() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#f5f1e8", background: "#0b0f14", minHeight: "100vh" }}>
      <h1>Faraday — Far a day</h1>
      <p>Free browser apps for your car. Beta — Test apps stay Beta until you test them.</p>
      {groups.map((g) => (
        <section key={g.category}>
          <h2>{g.category}</h2>
          {g.items.map((a) => (
            <article key={a.name} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <span>{a.tag}</span>
              <h3>{a.name}</h3>
              <p>{a.desc}</p>
              <p><a href={a.href} style={{ color: "#4da3ff" }}>Open in browser →</a></p>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
