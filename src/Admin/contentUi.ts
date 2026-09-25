// Class recipes shared by the Content section. Explicit radii on purpose: the design-system
// package builds rounded-sm/md/lg/xl from an undefined `--radius`, so those render square.
export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

export const SUCCESS_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const DANGER_TEXT_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

export const ICON_BUTTON =
  "inline-flex size-8 items-center justify-center rounded-[8px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30";

export const INPUT =
  "w-full rounded-[8px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500";

export const LABEL = "mb-1 block text-sm font-medium text-gray-700";

export const CARD = "rounded-[12px] border border-gray-200 bg-white p-4 md:p-6";
