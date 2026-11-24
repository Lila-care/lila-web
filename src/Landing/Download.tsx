import { DOWNLOAD_COPY, STORE_LINKS } from "./landingContent";
import { SectionContainer } from "./LandingPrimitives";
import StoreButton from "./StoreButton";

/** Target of every landing CTA (`#descargar`). No overflow-hidden: the store halos must not clip. */
export default function Download() {
  return (
    <section id="descargar" aria-labelledby="download-title" className="bg-[#faf6f0]">
      <SectionContainer className="flex flex-col items-center gap-8 pb-20 pt-16 text-center md:pb-28 md:pt-24 xl:pb-28 xl:pt-24">
        <div className="flex max-w-[640px] flex-col items-center gap-4">
          <h2
            id="download-title"
            className="font-['Poppins'] text-[32px] font-semibold leading-[1.18] tracking-[-0.3px] text-brand-dark md:text-[44px] md:tracking-[-0.44px]"
          >
            {DOWNLOAD_COPY.title}
          </h2>
          <p className="text-lg leading-7 text-[color:var(--text-secondary)]">
            {DOWNLOAD_COPY.subtitle}
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-5 px-1 py-2 sm:w-auto sm:flex-row sm:justify-center">
          <StoreButton store="appStore" href={STORE_LINKS.appStore} />
          <StoreButton store="playStore" href={STORE_LINKS.playStore} />
        </div>
        <p className="text-xs leading-4 text-[color:var(--text-muted)]">{DOWNLOAD_COPY.note}</p>
      </SectionContainer>
    </section>
  );
}
