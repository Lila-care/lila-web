import InstallIphoneCard from "./InstallIphoneCard";
import { DOWNLOAD_COPY, STORE_LINKS } from "./landingContent";
import { SectionContainer } from "./LandingPrimitives";
import StoreButton from "./StoreButton";

/** Target of every landing CTA (`#descargar`). No overflow-hidden: the store halos must not clip. */
export default function Download() {
  return (
    <section id="descargar" aria-labelledby="download-title" className="bg-brand-bg">
      <SectionContainer className="flex flex-col items-center gap-4 px-6 pb-[72px] pt-16 text-center md:gap-6 md:pb-28 md:pt-24">
        <h2
          id="download-title"
          className="font-['Poppins'] text-[32px] font-semibold leading-10 text-brand-dark md:text-[44px] md:leading-[1.18] md:tracking-[-0.44px]"
        >
          {DOWNLOAD_COPY.title}
        </h2>
        <p className="max-w-[560px] text-base leading-6 text-text-secondary">
          {DOWNLOAD_COPY.subtitle}
        </p>
        <div className="flex w-full flex-col items-center gap-3 py-4 sm:w-auto sm:flex-row sm:justify-center sm:gap-5">
          <StoreButton store="testFlight" href={STORE_LINKS.testFlight} />
          <StoreButton store="playStore" href={STORE_LINKS.playStore} />
        </div>
        <InstallIphoneCard />
        <p className="text-xs leading-4 text-text-muted">{DOWNLOAD_COPY.note}</p>
      </SectionContainer>
    </section>
  );
}
