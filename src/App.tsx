import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { Insight } from "./sections/Insight";
import { WhatWeAre } from "./sections/WhatWeAre";
import { Proof } from "./sections/Proof";
import { HowItWorks } from "./sections/HowItWorks";
import { WhoFor } from "./sections/WhoFor";
import { Stages } from "./sections/Stages";
import { FinalCTA } from "./sections/FinalCTA";
import { Footer } from "./sections/Footer";

// Section order IS the funnel: hook → why it matters → what we are → proof →
// how → who → price → filter+CTA. Do not reorder.
function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Insight />
        <WhatWeAre />
        <Proof />
        <HowItWorks />
        <WhoFor />
        <Stages />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

export default App;
