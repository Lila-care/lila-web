import appleIcon from "../assets/landing/icon-apple-heading.svg";
import infoIcon from "../assets/landing/icon-info.svg";
import { INSTALL_IPHONE_COPY } from "./landingContent";

/**
 * TestFlight install steps (Figma `instalar-iphone` + `paso-testflight`).
 * Temporary (KAN-174): delete once Lila is on the App Store.
 * Below `md` the badge sits above the title and the steps are rows; from `md`, three columns.
 */
export default function InstallIphoneCard() {
  const { badge, titleStart, titleEnd, intro, steps, note } = INSTALL_IPHONE_COPY;
  return (
    <div className="flex w-full max-w-[880px] flex-col gap-5 rounded-[24px] border border-border-default bg-surface-default p-6 text-left md:gap-6 md:px-10 md:py-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
          <img
            src={appleIcon}
            alt=""
            width={22}
            height={22}
            className="hidden shrink-0 md:block"
          />
          <h3 className="order-2 font-['Poppins'] text-xl font-semibold leading-7 text-brand-dark md:order-none">
            {titleStart} <br className="md:hidden" />
            {titleEnd}
          </h3>
          <span className="rounded-full bg-surface-brand-light px-2.5 py-1 font-['DM_Sans'] text-[11px] font-medium leading-4 text-brand-primary">
            {badge}
          </span>
        </div>
        <p className="text-sm leading-5 text-text-secondary">{intro}</p>
      </div>
      <ol className="m-0 flex list-none flex-col gap-5 p-0 md:flex-row md:gap-8">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-4 md:flex-1 md:flex-col md:gap-3">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-brand-light text-[13px] font-medium leading-[18px] text-brand-primary"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-none md:gap-3">
              <h4 className="font-['Poppins'] text-[17px] font-medium leading-6 text-brand-dark">
                {step.title}
              </h4>
              <p className="text-sm leading-5 text-text-secondary">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="h-px w-full bg-border-default" />
      <div className="flex items-start gap-2.5">
        <img src={infoIcon} alt="" width={20} height={20} className="shrink-0" />
        <p className="min-w-0 flex-1 text-sm leading-5 text-text-secondary">{note}</p>
      </div>
    </div>
  );
}
