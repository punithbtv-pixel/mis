import fs from "node:fs";
import path from "node:path";

// Company letterhead used on Excel/PDF exports — sourced from data/zyn.docx.
export const COMPANY_NAME = "ZYN MILS LIMITED.";
export const COMPANY_ADDRESS = "NO 52, FAGGE TAKUDU, KANTIN KWARI KANO STATE, NIGERIA";
export const COMPANY_TAGLINE = "INTEGERATED MANAGEMENT SYSTEM";

const LOGO_PATH = path.join(process.cwd(), "src/assets/zyn-logo.png");

// Original logo is 557x333px.
export const LOGO_ASPECT_RATIO = 557 / 333;

export function readLogoBuffer() {
  return fs.readFileSync(LOGO_PATH);
}
