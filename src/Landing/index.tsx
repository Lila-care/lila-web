import LandingNav from "./LandingNav";
import Hero from "./Hero";
import Pillars from "./Pillars";
import HowItWorks from "./HowItWorks";
import Privacy from "./Privacy";
import Plans from "./Plans";
import Social from "./Social";
import LandingFooter from "./LandingFooter";

/** Public marketing page at `/`: static content, no auth, no API calls. */
export default function LandingPage() {
  return (
    <div className="w-full overflow-x-clip bg-[#faf6f0] font-['Inter',sans-serif] text-[color:var(--text-primary)]">
      <LandingNav />
      <main>
        <Hero />
        <Pillars />
        <HowItWorks />
        <Privacy />
        <Plans />
        <Social />
      </main>
      <LandingFooter />
    </div>
  );
}
